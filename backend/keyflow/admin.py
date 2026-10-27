from django.contrib import admin

from .models import Result, TypingSession, User

admin.site.register(User)


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("user", "mode", "wpm", "accuracy", "created_at")
    list_filter = ("mode", "dataset")
    search_fields = ("user__username",)
    date_hierarchy = "created_at"


@admin.register(TypingSession)
class TypingSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "started_at", "wpm", "accuracy", "active_seconds", "dataset")
    list_filter = ("dataset",)
    search_fields = ("user__username",)
    date_hierarchy = "started_at"
    readonly_fields = ("id", "created_at")
