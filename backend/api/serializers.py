from rest_framework import serializers
from .models import DebateTurn


class DebateTurnSerializer(serializers.ModelSerializer):
    speaker_email = serializers.EmailField(source="speaker.email", read_only=True)

    class Meta:
        model = DebateTurn
        fields = [
            "id",
            "room",
            "speaker",
            "speaker_role",
            "speaker_email",
            "text",
            "turn_number",
            "turn_score",
            "timestamp",
        ]
