from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    class Meta(AbstractUser.Meta):
        constraints = [
            models.UniqueConstraint(Lower("username"), name="keyflow_user_username_ci_uniq")
        ]


class Result(models.Model):
    """Legacy per-test result (kept so existing rows survive the move to sessions)."""

    MODE_CHOICES = [("time", "Time"), ("words", "Words")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="results",
    )
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    duration = models.PositiveIntegerField(default=0)
    words = models.PositiveIntegerField(default=0)
    dataset = models.CharField(max_length=40, default="english-200")
    wpm = models.FloatField()
    raw = models.FloatField()
    accuracy = models.FloatField()
    consistency = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.user_id} {self.mode} {self.wpm:.0f}wpm"


class TypingSession(models.Model):
    """One continuous stretch of typing. The client generates the UUID, which
    makes bulk uploads idempotent (retries never duplicate a session)."""

    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="typing_sessions",
    )
    started_at = models.DateTimeField()
    active_seconds = models.FloatField(default=0)
    wpm = models.FloatField(default=0)
    raw = models.FloatField(default=0)
    accuracy = models.FloatField(default=0)
    consistency = models.FloatField(default=0)
    correct_chars = models.PositiveIntegerField(default=0)
    incorrect_chars = models.PositiveIntegerField(default=0)
    extra_chars = models.PositiveIntegerField(default=0)
    missed_chars = models.PositiveIntegerField(default=0)
    dataset = models.CharField(max_length=40, default="english-200")
    wpm_samples = models.JSONField(default=list, blank=True)
    key_stats = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["user", "-started_at"], name="keyflow_sess_user_start_idx")
        ]

    def __str__(self):
        return f"{self.user_id} {self.wpm:.0f}wpm {self.active_seconds:.0f}s"
