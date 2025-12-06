from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """
    Stores extra data for logged-in Kinde users.
    Django User.username will store the Kinde ID.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    kinde_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.kinde_id})"


class DebateTurn(models.Model):
    """
    Stores each speech-to-text message from a debate session.
    """
    room_code = models.CharField(max_length=50)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    turn_number = models.IntegerField()
    argument_text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.room_code} | {self.user.kinde_id} | turn {self.turn_number}"
