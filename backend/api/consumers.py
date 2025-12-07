import json
from channels.generic.websocket import AsyncWebsocketConsumer
import random
import string
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from .models import DebateRoom
from .neon_store import (
    async_store_transcript,
    async_store_debate_turn,
    async_store_room_event,
    async_store_audio_event,
)

# ---------------------------
# ROOM CONSUMER
# ---------------------------
ROOM_PARTICIPANTS = {}  # { "room_<code>": { channel_name: participant_dict, ... } }

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
                # --- Prevent duplicate connections for the same user/email in one room ---
        # If an existing channel is present for this same user, tell it to close
        # and remove it from the in-memory participant map. This ensures one
        # active socket / participant per browser/user (prevents duplicate echoes).
        existing_channels = [
            uid for uid, p in list(room_participants.items())
            if p.get("name") == self.user_name and uid != self.user_id
        ]
        for old_uid in existing_channels:
            try:
                # ask the old consumer instance to close itself
                await self.channel_layer.send(old_uid, {"type": "force_disconnect"})
            except Exception:
                # best-effort; ignore errors
                pass
            # remove stale record immediately from in-memory map
            room_participants.pop(old_uid, None)

        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"room_{self.room_code}"

        # Get email from query
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        email = params.get("email", ["Anonymous"])[0]
        self.user_name = email

        # 1) Determine role in DB (attacker/defender)
        room, role = await register_participant(self.room_code, email)

        # 2) If DB says room is full → stop immediately
        if role is None:
            await self.close()
            return

        self.user_role = role
        self.user_id = self.channel_name

        # 3) Load in-memory list
        room_participants = ROOM_PARTICIPANTS.setdefault(self.room_group_name, {})

        # Cleanup stale entries
        stale = [uid for uid, p in room_participants.items() if not p.get("isActive", True)]
        for uid in stale:
            room_participants.pop(uid, None)

        # 4) ENFORCE 2-PERSON LIMIT BEFORE ANYTHING ELSE
        if len(room_participants) >= 2:
            await self.close()
            return

        # 5) Add new participant BEFORE accept()
        self.participant = {
            "id": self.user_id,
            "name": self.user_name,
            "role": self.user_role,
            "isActive": True
        }
        room_participants[self.user_id] = self.participant

        # 6) NOW it is safe to accept websocket
        await async_store_room_event(self.room_code, self.user_name, "join")
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # 7) Send room state to this user
        await self.send(json.dumps({
            "type": "room_state",
            "self": self.participant,
            "participants": list(room_participants.values()),
        }))

        # 8) Announce join to others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_joined",
                "participant": self.participant,
                "sender_channel": self.channel_name
            }
        )
    async def forward_transcript(self, event):
         # Ignore if message came from self
        if event["sender_channel"] == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "speech_transcript",
            "sender": event["sender"],
            "transcript": event["transcript"],
        }))

    async def disconnect(self, close_code):
        """
        Called when the WebSocket closes.

        NOTE: This can be called even if connect() bailed out early
        (e.g. room full), so we must guard against missing attributes.
        """
        room_group = getattr(self, "room_group_name", None)
        user_id = getattr(self, "user_id", None)
        user_name = getattr(self, "user_name", None)

        # If we never fully connected / never set these, nothing to clean up
        if room_group is None or user_id is None:
            return

        # Mark this participant inactive in memory (helps in race conditions)
        room_participants = ROOM_PARTICIPANTS.get(room_group, {})
        pdata = room_participants.get(user_id)
        if pdata:
            pdata["isActive"] = False

        # Remove from room participant list
        room_participants.pop(user_id, None)

        # If room empty, remove the room key entirely
        if not room_participants and room_group in ROOM_PARTICIPANTS:
            ROOM_PARTICIPANTS.pop(room_group, None)
        await async_store_room_event(self.room_code, self.user_name, "leave")
        # Notify others that participant left
        await self.channel_layer.group_send(
            room_group,
            {
                "type": "participant_left",
                "user_id": user_id,
                "user_name": user_name or "Anonymous",
            },
        )

        # And leave the channel layer group
        await self.channel_layer.group_discard(
            room_group,
            self.channel_name,
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type")

        if message_type == "chat_message":
            # Broadcast chat message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_handler',
                    'message': data.get('message'),
                    # always use backend identity; ignore any client-sent sender
                    'sender': self.user_name,
                    'sender_id': self.user_id
                }
            )

        elif message_type == "toggle_audio":
            # Broadcast audio toggle status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'audio_status_handler',
                    'muted': data.get('muted'),
                    'user_id': self.user_id
                }
            )
            muted = data.get("muted")
            await async_store_audio_event(self.room_code, self.user_name, {"muted": muted})

        elif message_type == "speaking_status":
            # Broadcast speaking status to others
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'speaking_status_handler',
                    'isSpeaking': data.get('isSpeaking'),
                    'user_id': self.user_id,
                    'skip_sender': self.channel_name
                }
            )
            isSpeaking = data.get("isSpeaking")
            await async_store_audio_event(self.room_code, self.user_name, {"isSpeaking": isSpeaking})
        elif message_type == "speech_transcript":
            transcript = data.get("transcript")
            # transcript = data.get("transcript", "").strip()
            if transcript:
                # Broadcast ONLY to others — not to self
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "forward_transcript",
                        "sender_channel": self.channel_name,
                        "sender": self.user_name,
                        "transcript": transcript,
                    }
                )


        async def force_disconnect(self, event):
            """
            Handler to force-close a particular connection.
            The event will be sent to a channel_name to tell that consumer
            to close itself (useful for replacing duplicate connections).
            """
            # Close this connection (this triggers disconnect())
            await self.close()

    # Handler for participant_joined
    async def participant_joined(self, event):
        # don't echo the join back to the joiner
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "participant_joined",
            "participant": event["participant"]
        }))

    # Handler for participant_left
    async def participant_left(self, event):
        # send left notification to everyone except the socket that left
        if event['user_id'] != self.user_id:
            await self.send(text_data=json.dumps({
                'type': 'participant_left',
                'user_id': event['user_id'],
                'user_name': event['user_name']
            }))

    # Handler for chat_message
    async def chat_message_handler(self, event):
        # Don't send own messages back
        if event['sender_id'] != self.user_id:
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': event['message'],
                'sender': event['sender']
            }))

    # Handler for audio_status
    async def audio_status_handler(self, event):
        if event['user_id'] != self.user_id:
            await self.send(text_data=json.dumps({
                'type': 'audio_status',
                'muted': event['muted'],
                'user_id': event['user_id']
            }))

    # Handler for speaking_status
    async def speaking_status_handler(self, event):
        # Don't send to the user who emitted the speaking status
        if event.get('skip_sender') == self.channel_name:
            return

        # We send a simplified payload to the clients; client maps 'opponent'
        await self.send(text_data=json.dumps({
            'type': 'speaking_status',
            'isSpeaking': event['isSpeaking'],
            'user_id': 'opponent'
        }))

# ---------------------------
# MATCHMAKING CONSUMER
# ---------------------------
MATCH_QUEUE = []  # simple in-memory queue

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        print("Matchmaking connected:", self.channel_name)

    async def disconnect(self, close_code):
        # Remove from queue if present
        if self.channel_name in MATCH_QUEUE:
            MATCH_QUEUE.remove(self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("action") == "find_match":
            await self.handle_matchmaking()
        

    async def handle_matchmaking(self):
        # No one waiting → add player to queue
        if not MATCH_QUEUE:
            MATCH_QUEUE.append(self.channel_name)
            await self.send(json.dumps({"status": "waiting"}))
            return

        # Pair players
        player1 = MATCH_QUEUE.pop(0)
        player2 = self.channel_name

        room_code = self.generate_room_code()

        # Tell player1
        await self.channel_layer.send(
            player1,
            {
                "type": "match_found",
                "room_code": room_code,
            }
        )

        # Tell player2
        await self.send(json.dumps({
            "status": "matched",
            "room_code": room_code,
        }))

    def generate_room_code(self):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    async def match_found(self, event):
        await self.send(json.dumps({
            "status": "matched",
            "room_code": event["room_code"],
        }))

@database_sync_to_async
def register_participant(room_code, email):
    """
    Ensure a DebateRoom row exists and decide this user's role.
    Returns (room, role) where role is 'Challenger' or 'Defender',
    or None if room is already full.
    """
    room, created = DebateRoom.objects.get_or_create(
        room_code=room_code,
        defaults={
            "attacker_email": email,  # first person becomes attacker
            "defender_email": "",
        },
    )

    # same user reconnecting
    if room.attacker_email == email:
        return room, "Challenger"
    if room.defender_email == email:
        return room, "Defender"

    # new user joining – fill defender slot if free
    if not room.defender_email:
        room.defender_email = email
        room.save(update_fields=["defender_email"])
        return room, "Defender"

    # room already has 2 distinct users
    return room, None
