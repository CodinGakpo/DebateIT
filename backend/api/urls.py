from django.urls import path
from .views import ProtectedView, SaveTurnView

urlpatterns = [
    path("protected/", ProtectedView.as_view()),
    path("save_turn/", SaveTurnView.as_view()),
]
