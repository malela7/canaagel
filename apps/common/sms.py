"""
Thin client for Africa's Talking SMS.

Credentials come from settings (which read from .env). If AT_USERNAME /
AT_API_KEY are not configured (e.g. local dev), send_sms() silently no-ops
so the rest of the app keeps working without SMS.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
PRODUCTION_URL = "https://api.africastalking.com/version1/messaging"


def send_sms(*, phone_number: str, message: str) -> bool:
    """
    Send a single SMS via Africa's Talking. Returns True if the request was
    accepted, False otherwise (including when SMS is not configured).
    """
    if not settings.AT_USERNAME or not settings.AT_API_KEY:
        logger.info("SMS not configured -- skipping message to %s", phone_number)
        return False

    url = SANDBOX_URL if settings.AT_USERNAME == "sandbox" else PRODUCTION_URL

    payload = {
        "username": settings.AT_USERNAME,
        "to": phone_number,
        "message": message,
    }
    if settings.AT_SENDER_ID:
        payload["from"] = settings.AT_SENDER_ID

    try:
        response = requests.post(
            url,
            data=payload,
            headers={
                "apiKey": settings.AT_API_KEY,
                "Accept": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        return True
    except Exception:
        logger.exception("Failed to send SMS to %s", phone_number)
        return False
