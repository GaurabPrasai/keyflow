import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("keyflow", "0002_result"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TypingSession",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("started_at", models.DateTimeField()),
                ("active_seconds", models.FloatField(default=0)),
                ("wpm", models.FloatField(default=0)),
                ("raw", models.FloatField(default=0)),
                ("accuracy", models.FloatField(default=0)),
                ("consistency", models.FloatField(default=0)),
                ("correct_chars", models.PositiveIntegerField(default=0)),
                ("incorrect_chars", models.PositiveIntegerField(default=0)),
                ("extra_chars", models.PositiveIntegerField(default=0)),
                ("missed_chars", models.PositiveIntegerField(default=0)),
                ("dataset", models.CharField(default="english-200", max_length=40)),
                ("wpm_samples", models.JSONField(blank=True, default=list)),
                ("key_stats", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="typing_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-started_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "-started_at"], name="keyflow_sess_user_start_idx"
                    )
                ],
            },
        ),
    ]
