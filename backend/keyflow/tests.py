import json
import uuid
from datetime import timedelta
from urllib.parse import urlencode

from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import TypingSession, User

PASSWORD = "secret123"


def auth_payload(username="tester", password=PASSWORD):
    return {"username": username, "password": password}


class AuthTests(TestCase):
    def test_health(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_csrf_endpoint_sets_cookie(self):
        response = self.client.get(reverse("csrf"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", response.cookies)
        self.assertEqual(response["Cache-Control"], "no-store")

    @override_settings(ALLOWED_HOSTS=[".azurewebsites.net", "keyflow-bay.vercel.app"])
    def test_proxy_hosts_are_allowed(self):
        # The Vercel rewrite and App Service both send their own Host header.
        for host in ("keyflow-bay.vercel.app", "keyflow-api.azurewebsites.net"):
            response = self.client.get(reverse("health"), HTTP_HOST=host)
            self.assertEqual(response.status_code, 200)

    def test_register_logs_in_and_creates_five_char_password(self):
        response = self.client.post(
            reverse("register"), data=json.dumps(auth_payload(password="abc123")), content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["username"], "tester")
        self.assertEqual(self.client.get(reverse("me")).status_code, 200)

    def test_duplicate_username_is_case_insensitive(self):
        User.objects.create_user(username="Tester", password=PASSWORD)
        response = self.client.post(
            reverse("register"), data=json.dumps(auth_payload()), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "That username is taken")

    def test_short_password_rejected(self):
        response = self.client.post(
            reverse("register"), data=json.dumps(auth_payload(password="12345")), content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_username_rejected(self):
        response = self.client.post(
            reverse("register"),
            data=json.dumps(auth_payload(username="bad name!")),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_login_is_case_insensitive_and_logout_works(self):
        User.objects.create_user(username="tester", password=PASSWORD)
        response = self.client.post(
            reverse("login"),
            data=json.dumps(auth_payload(username="TESTER")),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.post(reverse("logout"))
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_wrong_password_message(self):
        User.objects.create_user(username="tester", password=PASSWORD)
        response = self.client.post(
            reverse("login"),
            data=json.dumps(auth_payload(password="nope123")),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Wrong username or password")

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_csrf_is_enforced(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            reverse("login"), data=json.dumps(auth_payload()), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)


def session_payload(**overrides):
    data = {
        "id": str(uuid.uuid4()),
        "startedAt": timezone.now().isoformat(),
        "activeSeconds": 42.5,
        "wpm": 62.3,
        "raw": 70.1,
        "accuracy": 96.5,
        "consistency": 81,
        "correct": 240,
        "incorrect": 9,
        "extra": 3,
        "missed": 5,
        "dataset": "english-200",
        "wpmSamples": [50, 60, 64, 61],
        "keyStats": {"a": [120, 2, 8400], "s": [90, 0, 6100]},
    }
    data.update(overrides)
    return data


class SessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password=PASSWORD)
        self.client.force_login(self.user)

    def bulk(self, sessions):
        return self.client.post(
            reverse("sessions-bulk"),
            data=json.dumps({"sessions": sessions}),
            content_type="application/json",
        )

    def test_bulk_requires_auth(self):
        self.client.logout()
        self.assertEqual(self.bulk([session_payload()]).status_code, 401)

    def test_bulk_creates_and_round_trips(self):
        payload = session_payload()
        response = self.bulk([payload])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accepted"], [payload["id"]])
        self.assertEqual(TypingSession.objects.count(), 1)

        listing = self.client.get(reverse("sessions")).json()["sessions"]
        self.assertEqual(len(listing), 1)
        self.assertEqual(listing[0]["id"], payload["id"])
        self.assertEqual(listing[0]["accuracy"], 96.5)
        self.assertEqual(listing[0]["keyStats"]["a"], [120, 2, 8400])

    def test_bulk_is_idempotent(self):
        payload = session_payload()
        self.bulk([payload])
        updated = dict(payload, wpm=70)
        response = self.bulk([updated])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TypingSession.objects.count(), 1)
        self.assertEqual(TypingSession.objects.get().wpm, 70)

    def test_bulk_rejects_impossible_values_but_keeps_valid_ones(self):
        good = session_payload()
        impossible = session_payload(wpm=999)
        bad_id = session_payload(id="not-a-uuid")
        response = self.bulk([good, impossible, bad_id])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accepted"], [good["id"]])
        self.assertEqual(len(response.json()["rejected"]), 2)
        self.assertEqual(TypingSession.objects.count(), 1)

    def test_bulk_cannot_overwrite_another_users_session(self):
        other = User.objects.create_user(username="other", password=PASSWORD)
        payload = session_payload()
        TypingSession.objects.create(
            id=payload["id"],
            user=other,
            started_at=timezone.now(),
            wpm=10,
        )
        response = self.bulk([payload])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["accepted"], [])
        self.assertEqual(TypingSession.objects.get().user_id, other.id)

    def test_bulk_limit(self):
        response = self.bulk([session_payload() for _ in range(101)])
        self.assertEqual(response.status_code, 400)

    def test_list_is_scoped_and_supports_since(self):
        other = User.objects.create_user(username="other", password=PASSWORD)
        TypingSession.objects.create(
            id=uuid.uuid4(), user=other, started_at=timezone.now(), wpm=99
        )
        old = session_payload(startedAt=(timezone.now() - timedelta(days=10)).isoformat())
        fresh = session_payload()
        self.bulk([old, fresh])

        listing = self.client.get(reverse("sessions")).json()["sessions"]
        self.assertEqual(len(listing), 2)
        since = timezone.now() - timedelta(days=1)
        query = urlencode({"since": since.isoformat()})
        filtered = self.client.get(f"{reverse('sessions')}?{query}").json()["sessions"]
        self.assertEqual([row["id"] for row in filtered], [fresh["id"]])

    def test_delete_all_and_export(self):
        payload = session_payload()
        self.bulk([payload])
        exported = self.client.get(reverse("export")).json()
        self.assertEqual(exported["user"]["username"], "tester")
        self.assertEqual(len(exported["sessions"]), 1)

        response = self.client.delete(reverse("sessions"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["deleted"], 1)
        self.assertEqual(TypingSession.objects.count(), 0)

    def test_session_endpoints_are_no_store(self):
        self.assertEqual(self.client.get(reverse("sessions"))["Cache-Control"], "no-store")
