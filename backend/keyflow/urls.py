from django.urls import path

from . import views

urlpatterns = [
    path("api/csrf/", views.csrf_view, name="csrf"),
    path("api/health/", views.health_view, name="health"),
    path("api/register/", views.register_view, name="register"),
    path("api/login/", views.login_view, name="login"),
    path("api/logout/", views.logout_view, name="logout"),
    path("api/me/", views.me_view, name="me"),
    path("api/sessions/", views.sessions_view, name="sessions"),
    path("api/sessions/bulk/", views.sessions_bulk_view, name="sessions-bulk"),
    path("api/export/", views.export_view, name="export"),
]
