from django.urls import path

from .views import (
    ProtectedView,
    RoomCreateView,
    RoomDetailView,
    RoomJoinView,
    RoomTurnsView,
    AssemblyTranscribeView,
    TextTranscriptView,
)

urlpatterns = [
    path("protected/", ProtectedView.as_view(), name="protected"),
    path("rooms/", RoomCreateView.as_view(), name="create_room"),
    path("rooms/<str:room_code>/", RoomDetailView.as_view(), name="room_detail"),
    path("rooms/<str:room_code>/join/", RoomJoinView.as_view(), name="join_room"),
    path("rooms/<str:room_code>/turns/", RoomTurnsView.as_view(), name="room_turns"),
    path("turns/", RoomTurnsView.as_view(), name="room_turns_query"),
    # Compatibility aliases for existing frontend calls
    path("save_turn/", RoomTurnsView.as_view(), name="save_turn"),
    path("get_room_turns/", RoomTurnsView.as_view(), name="get_room_turns"),
    path("transcribe/", AssemblyTranscribeView.as_view(), name="assembly_transcribe"),
    path("transcribe_text/", TextTranscriptView.as_view(), name="transcribe_text"),
]
