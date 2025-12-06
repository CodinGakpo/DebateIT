from django.db import models

class UserProfile(models.Model):
    kinde_id = models.CharField(max_length=200, unique=True)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class DebateArgument(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    room_code = models.CharField(max_length=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    text = models.TextField()

    def __str__(self):
        return f"{self.user.email} → {self.room_code}"
