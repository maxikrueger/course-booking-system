"""Dev-Settings: Debug an, Browsable API."""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK

DEBUG = True

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# Dev-CORS: zusätzlich zu CORS_ALLOWED_ORIGINS aus base.py auch
# Zugriffe vom lokalen Netzwerk erlauben (Smartphone/Tablet im gleichen WLAN
# auf den Dev-Server). Deckt localhost, 127.0.0.1 und die privaten IPv4-
# Subnetze 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12 auf beliebigen Ports ab.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://localhost(:\d+)?$",
    r"^https?://127\.0\.0\.1(:\d+)?$",
    r"^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$",
    r"^https?://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$",
    r"^https?://172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$",
]
