from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .kinde_auth import verify_kinde_jwt
from .models import UserProfile, DebateRoom, DebateTurn
from .serializers import DebateTurnSerializer


class ProtectedView(APIView):
    def get(self, request):
        payload = verify_kinde_jwt(request)

        kinde_id = payload.get("sub")
        email = payload.get("email", "")

        if not kinde_id:
            raise AuthenticationFailed("Invalid Kinde token")

        # 1️ Create Django User if not exists
        user_obj, created_user = User.objects.get_or_create(
            username=kinde_id,
            defaults={"email": email}
        )

        # 2️ Create UserProfile if not exists
        profile, created_profile = UserProfile.objects.get_or_create(
            kinde_id=kinde_id,
            defaults={
                "user": user_obj,
                "email": email
            }
        )

        return Response({
            "message": "Authenticated",
            "user_id": profile.id,
            "email": profile.email,
            "created_profile": created_profile,
            "created_user": created_user,
        })

class SaveTurnView(APIView):

    def post(self, request):
        payload = verify_kinde_jwt(request)
        kinde_id = payload.get("sub")

        if not kinde_id:
            raise AuthenticationFailed("Invalid Kinde token")

        # validate fields
        room_code = request.data.get("room_code")
        speaker_user_id = request.data.get("speaker_user_id")
        text = request.data.get("text")

        if not room_code or not speaker_user_id or not text:
            return Response({"error": "room_code, speaker_user_id, and text are required"}, status=400)

        # find room
        try:
            room = DebateRoom.objects.get(room_code=room_code)
        except DebateRoom.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        # find speaker
        try:
            speaker = UserProfile.objects.get(id=speaker_user_id)
        except UserProfile.DoesNotExist:
            return Response({"error": "Speaker user not found"}, status=404)

        # determine next turn number
        last_turn = DebateTurn.objects.filter(room=room).order_by('-turn_number').first()
        next_turn_number = (last_turn.turn_number + 1) if last_turn else 1

        # save turn
        turn = DebateTurn.objects.create(
            room=room,
            speaker=speaker,
            text=text,
            turn_number=next_turn_number,
        )

        return Response({
            "message": "Turn saved",
            "room": room.room_code,
            "turn_number": next_turn_number,
            "speaker": speaker.id,
            "text": text,
        })

class GetRoomTurnsView(APIView):

    def get(self, request):
        room_code = request.query_params.get("room_code")

        if not room_code:
            return Response({"error": "room_code is required"}, status=400)

        try:
            room = DebateRoom.objects.get(room_code=room_code)
        except DebateRoom.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        turns = DebateTurn.objects.filter(room=room).order_by("turn_number")
        serialized = DebateTurnSerializer(turns, many=True)

        return Response({"turns": serialized.data})
