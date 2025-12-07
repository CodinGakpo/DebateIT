from django.contrib import admin
from .models import DebateRoom, DebateTurn


@admin.register(DebateRoom)
class DebateRoomAdmin(admin.ModelAdmin):
    list_display = ("room_code", "attacker_email", "defender_email", "created_at", "winner_email")
    search_fields = ("room_code", "attacker_email", "defender_email")


@admin.register(DebateTurn)
class DebateTurnAdmin(admin.ModelAdmin):
    list_display = ("room", "turn_number", "speaker", "speaker_role", "timestamp", "turn_score")
    list_filter = ("room", "speaker_role")
