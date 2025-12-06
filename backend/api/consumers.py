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
