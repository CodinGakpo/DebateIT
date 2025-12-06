from django.urls import path
from .views import GetRoomTurnsView, ProtectedView, SaveTurnView

urlpatterns = [
    path("protected/", ProtectedView.as_view()),
    path("save_turn/", SaveTurnView.as_view()),
    path("get_room_turns/", GetRoomTurnsView.as_view()),
]
