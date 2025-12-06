import json
from channels.generic.websocket import AsyncWebsocketConsumer
import random
import string
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from .models import DebateRoom



# ---------------------------
# ROOM CONSUMER
# ---------------------------
ROOM_PARTICIPANTS = {}
class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"room_{self.room_code}"

        # --- Extract email from query parameters ---
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        email = params.get("email", ["Anonymous"])[0]
        self.user_name = email  # backend identity

        # --- Register participant in DB (creates/updates DebateRoom) ---
        room, role = await register_participant(self.room_code, email)

        if role is None:  # room already has 2 distinct players
            await self.close()
            return

        self.user_role = role
        self.user_id = self.channel_name  # stable ID

        # --- Track participants per room in memory ---
        room_participants = ROOM_PARTICIPANTS.setdefault(self.room_group_name, {})

        # Add participant data before sending room state
        self.participant = {
            "id": self.user_id,
            "name": self.user_name,
            "role": self.user_role,  # 🟢 from DB, not join order
            "isActive": True,
        }

        # Prevent over 2 participants
        if len(room_participants) >= 2 and self.user_id not in room_participants:
            await self.close(code=4001)
            return

        # Join channel group and accept WebSocket
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # --- Send full room state to THIS user ---
        await self.send(json.dumps({
            "type": "room_state",
            "self": self.participant,
            "participants": list(room_participants.values()),
        }))

        # Add to memory AFTER sending local state
        room_participants[self.user_id] = self.participant

        # --- Announce join to others ---
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_joined",
                "participant": self.participant,
                "sender_channel": self.channel_name,
            },
        )

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

        # Remove from room participant list
        room_participants = ROOM_PARTICIPANTS.get(room_group, {})
        room_participants.pop(user_id, None)

        if not room_participants and room_group in ROOM_PARTICIPANTS:
            ROOM_PARTICIPANTS.pop(room_group, None)

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
                    # ✅ always use backend name, ignore client "sender"
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

    # Handler for participant_joined
    async def participant_joined(self, event):
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "participant_joined",
            "participant": event["participant"]
        }))

    # Handler for participant_left
    async def participant_left(self, event):
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
        # Don't send to self
        if event.get('skip_sender') == self.channel_name:
            return
            
        await self.send(text_data=json.dumps({
            'type': 'speaking_status',
            'isSpeaking': event['isSpeaking'],
            'user_id': 'opponent'  # Always 'opponent' for the other person
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
