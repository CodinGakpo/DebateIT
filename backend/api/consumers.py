import json
from channels.generic.websocket import AsyncWebsocketConsumer
import random
import string
from urllib.parse import parse_qs


# ---------------------------
# ROOM CONSUMER
# ---------------------------
ROOM_PARTICIPANTS = {}
class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"room_{self.room_code}"

        # self.user = self.scope.get("user")
        # base_name = getattr(self.user, "email", None) or "Anonymous"
        # display_name = base_name.split("@")[0] if "@" in base_name else base_name

        # self.user_name = display_name
        # 🔹 Get email passed from frontend WebSocket
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        email = params.get("email", ["Anonymous"])[0]

        # Use full email as backend identity (UI shows “You” locally anyway)
        self.user_name = email


        # track participants for this room
        room_participants = ROOM_PARTICIPANTS.setdefault(self.room_group_name, {})
        num = len(room_participants)

        # ✅ max 2 participants
        if num >= 2:
            await self.close(code=4001)
            return

        # ✅ assign role based on join order
        if num == 0:
            role = "Challenger"
        else:
            role = "Defender"

        # stable id for this connection
        self.user_id = self.channel_name

        self.participant = {
            "id": self.user_id,
            "name": display_name,
            "role": role,
            "isActive": True,
        }

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # send full room state to THIS client only
        await self.send(json.dumps({
            "type": "room_state",
            "self": self.participant,
            "participants": list(room_participants.values()),
        }))

        # add to room list
        room_participants[self.user_id] = self.participant

        # tell others that someone joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "participant_joined",
                "participant": self.participant,
                "sender_channel": self.channel_name,
            },
        )

    async def participant_joined(self, event):
        # ignore our own join event (we already know about ourselves)
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(json.dumps({
            "type": "participant_joined",
            "participant": event["participant"],
        }))

    async def disconnect(self, close_code):
        # Remove from room participant list
        room_participants = ROOM_PARTICIPANTS.get(self.room_group_name, {})
        room_participants.pop(self.user_id, None)
        if not room_participants:
            ROOM_PARTICIPANTS.pop(self.room_group_name, None)

        # Notify others that participant left
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_left',
                'user_id': self.user_id,
                'user_name': self.user_name
            }
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
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
        # Don't send to self
        if event.get('skip_sender') == self.channel_name:
            return
            
        await self.send(text_data=json.dumps({
            'type': 'participant_joined',
            'participant': event['participant']
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