"""
Thin client for the M-Pesa Daraja API (STK Push).

All credentials come from settings (which read from .env -- never hardcode
them here). Defaults to the Daraja sandbox host; set MPESA_ENV=production
in .env.production once you've completed Safaricom's "Go Live" process.
"""

import base64
from datetime import datetime

import requests
from django.conf import settings

SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"


def _base_url() -> str:
    return PRODUCTION_BASE_URL if settings.MPESA_ENV == "production" else SANDBOX_BASE_URL


def get_access_token() -> str:
    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    response = requests.get(
        url,
        auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def _password_and_timestamp():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def stk_push(*, phone_number: str, amount, account_reference: str, description: str):
    """
    Trigger an STK push (payment prompt) on the customer's phone.

    phone_number must be in 2547XXXXXXXX format.
    Returns the Daraja response dict, which includes CheckoutRequestID.
    """
    token = get_access_token()
    password, timestamp = _password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": description,
    }

    response = requests.post(
        f"{_base_url()}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
