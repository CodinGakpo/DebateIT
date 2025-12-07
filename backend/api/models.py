from django.contrib.auth.models import User
from django.db import models


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
    room_code = models.CharField(max_length=16, primary_key=True)
    attacker_email = models.EmailField()
    defender_email = models.EmailField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    winner_email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return f"Room {self.room_code}"


class DebateTurn(models.Model):
    SPEAKER_ATTACKER = "ATTACKER"
    SPEAKER_DEFENDER = "DEFENDER"
    SPEAKER_CHOICES = [
        (SPEAKER_ATTACKER, "Attacker"),
        (SPEAKER_DEFENDER, "Defender"),
    ]

    room = models.ForeignKey(DebateRoom, related_name="turns", on_delete=models.CASCADE)
    speaker = models.ForeignKey(
        UserProfile, related_name="turns", on_delete=models.CASCADE
    )
    speaker_role = models.CharField(max_length=10, choices=SPEAKER_CHOICES)
    text = models.TextField()
    turn_number = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    turn_score = models.IntegerField(default=0)

    class Meta:
        unique_together = ("room", "turn_number")
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.room.room_code} - Turn {self.turn_number} ({self.speaker_role})"
