# Generated for the Result model.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):

    dependencies = [
        ("keyflow", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Result",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("mode", models.CharField(choices=[("time", "Time"), ("words", "Words")], max_length=10)),
                ("duration", models.PositiveIntegerField(default=0)),
                ("words", models.PositiveIntegerField(default=0)),
                ("dataset", models.CharField(default="english-200", max_length=40)),
                ("wpm", models.FloatField()),
                ("raw", models.FloatField()),
                ("accuracy", models.FloatField()),
                ("consistency", models.FloatField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="results",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="result",
            index=models.Index(fields=["user", "-created_at"], name="keyflow_res_user_id_bc3877_idx"),
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                Lower("username"),
                name="keyflow_user_username_ci_uniq",
            ),
        ),
    ]
