from rest_framework import serializers
from .models import DebateTurn

class DebateTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTurn
        fields = ["id", "room", "speaker", "text", "turn_number", "timestamp"]
