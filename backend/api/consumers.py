import json
from channels.generic.websocket import AsyncWebsocketConsumer

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"room_{self.room_code}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type")

        if message_type == "change_color":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_color",
                    "color": data["color"]
                }
            )

    async def broadcast_color(self, event):
        await self.send(text_data=json.dumps({
            "type": "color_update",
            "color": event["color"]
        }))
# ---------------------------
# NEW MATCHMAKING CONSUMER
# ---------------------------
import json
from channels.generic.websocket import AsyncWebsocketConsumer
import random, string

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
