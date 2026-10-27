import json
import logging
import math
import re
import uuid
from datetime import timedelta
from functools import wraps

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import TypingSession

logger = logging.getLogger("keyflow")
User = get_user_model()

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
DATASETS = {"english-200", "english-1k", "english-5k", "commonly-misspelled"}
RATE_LIMIT = 10
RATE_WINDOW = 60
MAX_SESSIONS_PER_BULK = 100
MAX_ACTIVE_SECONDS = 6 * 60 * 60
MAX_WPM = 400.0
MAX_RAW = 500.0
MAX_CHARS = 200_000


def _error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def _user_payload(user):
    return {"id": user.id, "username": user.username}


def _json_body(request):
    try:
        data = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid JSON data") from exc
    if not isinstance(data, dict):
        raise ValueError("Invalid JSON data")
    return data


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _rate_limited(request, bucket, limit=RATE_LIMIT, window=RATE_WINDOW):
    key = f"throttle:{bucket}:{_client_ip(request)}"
    if cache.add(key, 1, window):
        return False
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, window)
        return False
    return count > limit


def json_endpoint(view):
    """Turn bad JSON into 400 and unexpected failures into a generic 500."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except ValueError as exc:
            return _error(str(exc), 400)
        except IntegrityError:
            logger.exception("Database integrity error")
            return _error("That username is taken", 400)
        except Exception:
            logger.exception("Unhandled error in %s", view.__name__)
            return _error("Something went wrong", 500)

    return wrapper


def _number(value, minimum, maximum):
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid session values") from exc
    if not math.isfinite(number) or number < minimum or number > maximum:
        raise ValueError("Invalid session values")
    return round(number, 2)


def _integer(value, maximum):
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid session values") from exc
    if number < 0 or number > maximum:
        raise ValueError("Invalid session values")
    return number


def _clean_samples(value):
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > 240:
        raise ValueError("Invalid session values")
    samples = []
    for item in value:
        samples.append(_number(item, 0, 1000))
    return samples


def _clean_key_stats(value):
    if value is None:
        return {}
    if not isinstance(value, dict) or len(value) > 250:
        raise ValueError("Invalid session values")
    cleaned = {}
    for key, stats in value.items():
        if not isinstance(key, str) or not key or len(key) > 4:
            raise ValueError("Invalid session values")
        if not isinstance(stats, (list, tuple)) or len(stats) != 3:
            raise ValueError("Invalid session values")
        count = _integer(stats[0], MAX_CHARS)
        errors = _integer(stats[1], MAX_CHARS)
        total_ms = _number(stats[2], 0, MAX_ACTIVE_SECONDS * 1000)
        cleaned[key] = [count, errors, round(total_ms)]
    return cleaned


def _clean_session(raw):
    """Validate one incoming session and return model defaults."""
    if not isinstance(raw, dict):
        raise ValueError("Invalid session")
    session_id = str(raw.get("id") or "").strip()
    try:
        uuid.UUID(session_id)
    except (ValueError, AttributeError) as exc:
        raise ValueError("Invalid session id") from exc

    started_at = parse_datetime(str(raw.get("startedAt") or ""))
    if started_at is None:
        raise ValueError("Invalid session date")
    if timezone.is_naive(started_at):
        started_at = timezone.make_aware(started_at, timezone.utc)
    if started_at > timezone.now() + timedelta(days=1):
        raise ValueError("Invalid session date")

    dataset = str(raw.get("dataset") or "english-200")
    if dataset not in DATASETS:
        raise ValueError("Invalid dataset")

    return session_id, {
        "started_at": started_at,
        "active_seconds": _number(raw.get("activeSeconds", 0), 0, MAX_ACTIVE_SECONDS),
        "wpm": _number(raw.get("wpm", 0), 0, MAX_WPM),
        "raw": _number(raw.get("raw", 0), 0, MAX_RAW),
        "accuracy": _number(raw.get("accuracy", 0), 0, 100),
        "consistency": _number(raw.get("consistency", 0), 0, 100),
        "correct_chars": _integer(raw.get("correct", 0), MAX_CHARS),
        "incorrect_chars": _integer(raw.get("incorrect", 0), MAX_CHARS),
        "extra_chars": _integer(raw.get("extra", 0), MAX_CHARS),
        "missed_chars": _integer(raw.get("missed", 0), MAX_CHARS),
        "dataset": dataset,
        "wpm_samples": _clean_samples(raw.get("wpmSamples")),
        "key_stats": _clean_key_stats(raw.get("keyStats")),
    }


def _serialize_session(session):
    return {
        "id": str(session.id),
        "startedAt": session.started_at.isoformat(),
        "activeSeconds": session.active_seconds,
        "wpm": session.wpm,
        "raw": session.raw,
        "accuracy": session.accuracy,
        "consistency": session.consistency,
        "correct": session.correct_chars,
        "incorrect": session.incorrect_chars,
        "extra": session.extra_chars,
        "missed": session.missed_chars,
        "dataset": session.dataset,
        "wpmSamples": session.wpm_samples,
        "keyStats": session.key_stats,
    }


@require_GET
@ensure_csrf_cookie
def csrf_view(request):
    return JsonResponse({"detail": "CSRF cookie set"})


@require_GET
def health_view(request):
    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response


@require_POST
@json_endpoint
def register_view(request):
    if _rate_limited(request, "register"):
        return _error("Too many attempts. Try again in a minute.", 429)

    data = _json_body(request)
    username = str(data.get("username", "")).strip()
    password = data.get("password") or ""

    if not USERNAME_RE.match(username):
        return _error("Username must be 3-20 letters, numbers or underscores")
    if not isinstance(password, str) or len(password) < 6:
        return _error("Password must be at least 6 characters")
    if User.objects.filter(username__iexact=username).exists():
        return _error("That username is taken")

    try:
        validate_password(password)
    except ValidationError as exc:
        return _error(" ".join(exc.messages))

    user = User.objects.create_user(username=username, password=password)
    login(request, user)
    return JsonResponse(
        {"user": _user_payload(user), "message": "Account created"},
        status=201,
    )


@require_POST
@json_endpoint
def login_view(request):
    if _rate_limited(request, "login"):
        return _error("Too many attempts. Try again in a minute.", 429)

    data = _json_body(request)
    username = str(data.get("username", "")).strip()
    password = data.get("password")
    if not username or not isinstance(password, str) or not password:
        return _error("Username and password are required")

    account = User.objects.filter(username__iexact=username).first()
    user = authenticate(
        request,
        username=account.username if account else username,
        password=password,
    )
    if user is None:
        return _error("Wrong username or password")
    if not user.is_active:
        return _error("This account is disabled")

    login(request, user)
    return JsonResponse({"user": _user_payload(user), "message": "Signed in"})


@require_POST
@json_endpoint
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Signed out"})


@require_GET
@json_endpoint
def me_view(request):
    if not request.user.is_authenticated:
        return _error("Authentication required", 401)
    return JsonResponse({"user": _user_payload(request.user)})


@require_POST
@json_endpoint
def sessions_bulk_view(request):
    if not request.user.is_authenticated:
        return _error("Authentication required", 401)
    if _rate_limited(request, "sessions", limit=60, window=60):
        return _error("Too many uploads. Slow down.", 429)

    data = _json_body(request)
    incoming = data.get("sessions")
    if not isinstance(incoming, list):
        return _error("sessions must be a list")
    if len(incoming) > MAX_SESSIONS_PER_BULK:
        return _error(f"Send at most {MAX_SESSIONS_PER_BULK} sessions per request")

    accepted = []
    rejected = []
    for raw in incoming:
        try:
            session_id, fields = _clean_session(raw)
        except ValueError as exc:
            rejected.append({"id": str(raw.get("id", "")) if isinstance(raw, dict) else "", "error": str(exc)})
            continue

        existing = TypingSession.objects.filter(pk=session_id).first()
        if existing is not None and existing.user_id != request.user.id:
            rejected.append({"id": session_id, "error": "Session belongs to another account"})
            continue
        if existing is None:
            TypingSession.objects.create(pk=session_id, user=request.user, **fields)
        else:
            for field, value in fields.items():
                setattr(existing, field, value)
            existing.save(update_fields=list(fields))
        accepted.append(session_id)

    return JsonResponse({"accepted": accepted, "rejected": rejected})


@require_http_methods(["GET", "DELETE"])
@json_endpoint
def sessions_view(request):
    if not request.user.is_authenticated:
        return _error("Authentication required", 401)

    if request.method == "DELETE":
        deleted, _ = request.user.typing_sessions.all().delete()
        return JsonResponse({"deleted": deleted})

    queryset = request.user.typing_sessions.all()
    since = request.GET.get("since")
    if since:
        parsed = parse_datetime(since)
        if parsed is None:
            return _error("Invalid since value")
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.utc)
        queryset = queryset.filter(started_at__gte=parsed)

    try:
        limit = int(request.GET.get("limit", 200))
    except (TypeError, ValueError):
        limit = 200
    limit = max(1, min(limit, 500))

    rows = list(queryset[:limit])
    return JsonResponse({"sessions": [_serialize_session(row) for row in rows]})


@require_GET
@json_endpoint
def export_view(request):
    if not request.user.is_authenticated:
        return _error("Authentication required", 401)
    rows = request.user.typing_sessions.all()[:5000]
    return JsonResponse(
        {
            "user": _user_payload(request.user),
            "exportedAt": timezone.now().isoformat(),
            "sessions": [_serialize_session(row) for row in rows],
        }
    )
