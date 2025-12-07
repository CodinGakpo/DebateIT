import json
import os
import random
import string
import tempfile

from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView

from .kinde_auth import verify_kinde_jwt
from .models import DebateRoom, DebateTurn, UserProfile
from .serializers import DebateTurnSerializer
from .neon_store import store_transcript

try:
    import assemblyai as aai  # type: ignore
except Exception:
    aai = None

def generate_room_code(length: int = 6) -> str:
    """Return a unique room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if not DebateRoom.objects.filter(room_code=code).exists():
            return code


class ProtectedView(APIView):
    """
    Verify a Kinde token, ensure a Django User/UserProfile exist, and return user info.
    """

    def get(self, request):
        payload = verify_kinde_jwt(request)
        kinde_id = payload.get("sub")
        email = payload.get("email", "")

        if not kinde_id:
            raise AuthenticationFailed("Invalid Kinde token")

        user_obj, created_user = User.objects.get_or_create(
            username=kinde_id, defaults={"email": email}
        )

        profile, created_profile = UserProfile.objects.get_or_create(
            kinde_id=kinde_id,
            defaults={"user": user_obj, "email": email},
        )

        return Response(
            {
                "message": "Authenticated",
                "user_id": profile.id,
                "email": profile.email,
                "created_profile": created_profile,
                "created_user": created_user,
            }
        )


class RoomCreateView(APIView):
    """
    Create a room with the requester as the attacker.
    """

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        room = DebateRoom.objects.create(
            room_code=generate_room_code(),
            attacker_email=email,
            defender_email="",
        )

        return Response(
            {
                "roomCode": room.room_code,
                "attackerEmail": room.attacker_email,
                "defenderEmail": room.defender_email,
                "winnerEmail": room.winner_email,
                "youAre": "ATTACKER",
            },
            status=status.HTTP_201_CREATED,
        )


class RoomJoinView(APIView):
    """
    Join an existing room. Fills defender slot if empty, otherwise ensures the user is part of the room.
    """

    def post(self, request, room_code: str):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = DebateRoom.objects.get(room_code=room_code)
        except DebateRoom.DoesNotExist:
            return Response({"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        if email == room.attacker_email:
            you_are = "ATTACKER"
        elif email == room.defender_email:
            you_are = "DEFENDER"
        else:
            if not room.defender_email:
                room.defender_email = email
                room.save(update_fields=["defender_email"])
                you_are = "DEFENDER"
            else:
                return Response({"detail": "Room already full"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "roomCode": room.room_code,
                "attackerEmail": room.attacker_email,
                "defenderEmail": room.defender_email,
                "winnerEmail": room.winner_email,
                "youAre": you_are,
            }
        )


class RoomDetailView(APIView):
    """
    Return room details (and optional turns).
    """

    def get(self, request, room_code: str):
        include_turns = request.query_params.get("include_turns") == "true"
        try:
            room = DebateRoom.objects.get(room_code=room_code)
        except DebateRoom.DoesNotExist:
            return Response({"detail": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "roomCode": room.room_code,
            "attackerEmail": room.attacker_email,
            "defenderEmail": room.defender_email or None,
            "winnerEmail": room.winner_email,
            "createdAt": room.created_at,
        }

        if include_turns:
            turns = DebateTurn.objects.filter(room=room).order_by("turn_number")
            data["turns"] = DebateTurnSerializer(turns, many=True).data

        return Response(data)


class RoomTurnsView(APIView):
    """
    GET: return ordered turns for a room.
    POST: create a new turn. Accepts either URL param room_code or room_code in body.
    """

    def get(self, request, room_code: str | None = None):
        code = room_code or request.query_params.get("room_code")
        if not code:
            return Response({"error": "room_code is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = DebateRoom.objects.get(room_code=code)
        except DebateRoom.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        turns = DebateTurn.objects.filter(room=room).order_by("turn_number")
        serialized = DebateTurnSerializer(turns, many=True)
        return Response({"turns": serialized.data})

    def post(self, request, room_code: str | None = None):
        payload = verify_kinde_jwt(request)
        kinde_id = payload.get("sub")
        email_from_token = payload.get("email", "")

        if not kinde_id:
            raise AuthenticationFailed("Invalid Kinde token")

        code = room_code or request.data.get("room_code")
        speaker_user_id = request.data.get("speaker_user_id")
        text = request.data.get("text")
        speaker_role = (request.data.get("speaker_role") or "").upper()

        if not code or not speaker_user_id or not text:
            return Response(
                {"error": "room_code, speaker_user_id, and text are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            room = DebateRoom.objects.get(room_code=code)
        except DebateRoom.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            speaker = UserProfile.objects.get(id=speaker_user_id)
        except UserProfile.DoesNotExist:
            return Response({"error": "Speaker user not found"}, status=status.HTTP_404_NOT_FOUND)

        if speaker.kinde_id != kinde_id:
            return Response({"error": "Token does not match speaker"}, status=status.HTTP_403_FORBIDDEN)

        last_turn = DebateTurn.objects.filter(room=room).order_by("-turn_number").first()
        next_turn_number = (last_turn.turn_number + 1) if last_turn else 1

        # Infer role if not provided
        if speaker_role not in (DebateTurn.SPEAKER_ATTACKER, DebateTurn.SPEAKER_DEFENDER):
            if speaker.email == room.attacker_email:
                speaker_role = DebateTurn.SPEAKER_ATTACKER
            elif speaker.email == room.defender_email:
                speaker_role = DebateTurn.SPEAKER_DEFENDER
            else:
                speaker_role = DebateTurn.SPEAKER_ATTACKER

        turn = DebateTurn.objects.create(
            room=room,
            speaker=speaker,
            speaker_role=speaker_role,
            text=text,
            turn_number=next_turn_number,
        )

        serialized = DebateTurnSerializer(turn)
        return Response(
            {"message": "Turn saved", "turn": serialized.data},
            status=status.HTTP_201_CREATED,
        )


class AssemblyTranscribeView(APIView):
    """
    Transcribe audio via AssemblyAI. Expects either:
      - multipart upload 'audio' (file)
      - OR JSON field 'audio_url' pointing to a publicly reachable audio file
    """

    def post(self, request):
        if aai is None:
            return Response(
                {"error": "assemblyai package not installed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not api_key:
            return Response(
                {"error": "ASSEMBLYAI_API_KEY not set on server"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        aai.settings.api_key = api_key

        audio_url = request.data.get("audio_url")
        file_obj = request.FILES.get("audio")

        if not audio_url and not file_obj:
            return Response(
                {"error": "Provide either audio_url or upload an audio file as 'audio'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prepare input for transcriber
        transcriber = aai.Transcriber(
            config=aai.TranscriptionConfig(speech_models=["universal"])
        )

        try:
            if audio_url:
                transcript = transcriber.transcribe(audio_url)
            else:
                # Write uploaded file to a temp path for the SDK (Windows-friendly)
                tmp_path = None
                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                        tmp_path = tmp.name
                        for chunk in file_obj.chunks():
                            tmp.write(chunk)
                        tmp.flush()
                    transcript = transcriber.transcribe(tmp_path)
                finally:
                    if tmp_path:
                        try:
                            os.remove(tmp_path)
                        except OSError:
                            pass
        except Exception as exc:
            return Response(
                {"error": "Transcription failed", "detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if transcript.status == "error":
            return Response(
                {"error": "Transcription failed", "detail": transcript.error},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        text_out = transcript.text or ""
        store_transcript(
        room_code=request.data.get("room_code"),
        speaker=request.data.get("speaker"),
        content=text_out,
        source=1  # ONE-MINUTE SPEECH
    )


        return Response({"transcript": text_out})


class TextTranscriptView(APIView):
    """
    Accept plain text transcript and persist to Neon if configured.
    Fields: text (required), speaker (optional), room_code (optional)
    """

    def post(self, request):
        text = (request.data.get("text") or "").strip()
        speaker = request.data.get("speaker")
        room_code = request.data.get("room_code")

        if not text:
            return Response({"error": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        store_transcript(
            room_code=room_code,
            speaker=speaker,
            content=text
        )

        return Response({"stored": True})


# Legacy JSON views kept for compatibility with the frontend (non-DRF)
@csrf_exempt
def create_room(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body.decode("utf-8"))
        email = body["email"]
    except (json.JSONDecodeError, KeyError):
        return JsonResponse({"detail": "Invalid JSON or missing email"}, status=400)

    room = DebateRoom.objects.create(
        room_code=generate_room_code(),
        attacker_email=email,
        defender_email="",
    )

    return JsonResponse(
        {
            "roomCode": room.room_code,
            "attackerEmail": room.attacker_email,
            "defenderEmail": room.defender_email,
            "winnerEmail": room.winner_email,
            "youAre": "ATTACKER",
        },
        status=201,
    )


@csrf_exempt
def join_room(request, room_code):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body.decode("utf-8"))
        email = body["email"]
    except (json.JSONDecodeError, KeyError):
        return JsonResponse({"detail": "Invalid JSON or missing email"}, status=400)

    try:
        room = DebateRoom.objects.get(room_code=room_code)
    except DebateRoom.DoesNotExist:
        return JsonResponse({"detail": "Room not found"}, status=404)

    if email == room.attacker_email:
        you_are = "ATTACKER"
    elif email == room.defender_email:
        you_are = "DEFENDER"
    else:
        if not room.defender_email:
            room.defender_email = email
            room.save(update_fields=["defender_email"])
            you_are = "DEFENDER"
        else:
            return JsonResponse({"detail": "Room already full"}, status=400)

    return JsonResponse(
        {
            "roomCode": room.room_code,
            "attackerEmail": room.attacker_email,
            "defenderEmail": room.defender_email,
            "winnerEmail": room.winner_email,
            "youAre": you_are,
        }
    )
