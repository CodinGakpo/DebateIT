from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """
    Stores additional info for authenticated Kinde users.
    Django User.username = Kinde ID
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    email = models.EmailField(max_length=255, blank=True)
    kinde_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.email})"


class DebateRoom(models.Model):
    """
    Stores debate session metadata.
    Used for both manual join and matchmaking.
    """
    room_code = models.CharField(max_length=20, unique=True)
    participants = models.ManyToManyField(
        UserProfile,
        related_name="rooms",
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["room_code"]),
        ]

    def __str__(self):
        return f"Room {self.room_code}"


class DebateTurn(models.Model):
    """
    Each speech turn in a debate.
    """
    room = models.ForeignKey(DebateRoom, on_delete=models.CASCADE)
    speaker = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    text = models.TextField()
    turn_number = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["turn_number"]
        indexes = [
            models.Index(fields=["room", "turn_number"]),
        ]

    def __str__(self):
        return f"Turn {self.turn_number} in {self.room.room_code} by {self.speaker.user.username}"
