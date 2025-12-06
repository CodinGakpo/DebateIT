from django.urls import path
from .views import GetRoomTurnsView, ProtectedView, SaveTurnView 
from . import views

urlpatterns = [
    path("protected/", ProtectedView.as_view()),
    path("save_turn/", SaveTurnView.as_view()),
    path("get_room_turns/", GetRoomTurnsView.as_view()),

    path("rooms/", views.create_room, name="create_room"),               # POST
    path("rooms/<str:room_code>/join/", views.join_room, name="join_room"), 
]
