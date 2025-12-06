from django.urls import re_path
from .consumers import RoomConsumer, MatchmakingConsumer

websocket_urlpatterns = [
    re_path(r"ws/room/(?P<room_code>\w+)/$", RoomConsumer.as_asgi()),
    re_path(r"ws/matchmaking/$", MatchmakingConsumer.as_asgi()),
]
