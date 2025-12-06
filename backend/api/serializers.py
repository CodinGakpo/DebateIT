from rest_framework import serializers
from .models import DebateTurn

class DebateTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebateTurn
        fields = ["id", "room", "speaker", "text", "timestamp"]
        read_only_fields = ["id", "timestamp"]
