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
    # e.g. "A1B2C3" – you can change max_length if your codes are longer
    room_code = models.CharField(max_length=16, primary_key=True)

    attacker_email = models.EmailField()
    defender_email = models.EmailField()

    created_at = models.DateTimeField(auto_now_add=True)

    # fill this when the debate finishes – can be attacker/defender email
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

    room = models.ForeignKey(
        DebateRoom,
        related_name="turns",
        on_delete=models.CASCADE,
    )

    # who is speaking this turn (relative to the room)
    speaker = models.CharField(max_length=10, choices=SPEAKER_CHOICES)

    text = models.TextField()

    # turn number inside that room: 1, 2, 3...
    turn_no = models.PositiveIntegerField()

    timestamp = models.DateTimeField(auto_now_add=True)

    # ML score for this turn
    turn_score = models.IntegerField(default=0)

    class Meta:
        # "turn_no (PK)" in your drawing → unique per room
        unique_together = ("room", "turn_no")
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.room.room_code} - Turn {self.turn_no} ({self.speaker})"
