"""
SMS service module — sends real SMS via Twilio.
Enforces E.164 format and provides detailed diagnostic logging.
Never crashes: returns a result dict with success/failure info.
"""
import os
import sys
import logging
import re

logger = logging.getLogger(__name__)

def safe_print(msg: str):
    """Safely print to stdout without crashing on Windows cp1252 console encoding."""
    try:
        print(msg, flush=True)
    except Exception:
        try:
            enc = sys.stdout.encoding or "utf-8"
            ascii_msg = msg.replace("\u2192", "->")
            sys.stdout.buffer.write((ascii_msg + "\n").encode(enc, errors="replace"))
            sys.stdout.buffer.flush()
        except Exception:
            pass

# Lazy-loaded Twilio client
_twilio_client = None
_twilio_from = None
_twilio_configured = None


def normalize_e164(phone: str, default_country_code: str = "+91") -> str:
    """
    Format phone number to strict E.164 standard (+ followed by 10-15 digits).
    Removes hyphens, spaces, parentheses, dots.
    If a 10-digit number is provided without a country code, prepends default_country_code.
    """
    if not phone:
        return ""
    cleaned = phone.strip()
    digits = re.sub(r"[^\d]", "", cleaned)
    if cleaned.startswith("+"):
        return f"+{digits}"
    if len(digits) == 10:
        return f"{default_country_code}{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}" if digits else ""


def mask_phone(phone: str) -> str:
    """Masks phone number for safe logging: e.g. +91******1234."""
    if not phone:
        return "NONE"
    p = phone.strip()
    if len(p) <= 6:
        return p
    prefix = p[:3]
    suffix = p[-4:]
    return f"{prefix}******{suffix}"


def _get_twilio():
    """Initialize Twilio client on first use. Returns (client, from_number) or (None, None)."""
    global _twilio_client, _twilio_from, _twilio_configured

    if _twilio_configured is True:
        return _twilio_client, _twilio_from

    try:
        from dotenv import load_dotenv, find_dotenv
        load_dotenv(find_dotenv())
        backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(backend_env):
            load_dotenv(backend_env, override=False)
    except Exception:
        pass

    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    if from_number:
        # Clean any whitespace or formatting from the from_number
        from_number = normalize_e164(from_number)

    if not account_sid or not auth_token or not from_number:
        logger.warning("Twilio credentials not configured.")
        _twilio_configured = False
        return None, None

    try:
        from twilio.rest import Client
        _twilio_client = Client(account_sid, auth_token)
        _twilio_from = from_number
        _twilio_configured = True
        logger.info("Twilio client initialized successfully.")
        return _twilio_client, _twilio_from
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {e}")
        _twilio_configured = False
        return None, None


def send_sms(to: str, body: str) -> dict:
    """
    Send an SMS message via Twilio.

    Returns:
        {
            "success": True/False,
            "delivery_mode": "REAL",
            "message_sid": "SM..." (on success),
            "status": "queued" / "sent" / "failed",
            "error_code": 572002 / None,
            "error": "..." (on failure),
        }
    """
    to_normalized = normalize_e164(to)
    masked_to = mask_phone(to_normalized)

    # Required logging: First line of send_sms
    safe_print(f"[SMS] send_sms() CALLED → {masked_to}")
    logger.info(f"[SMS] send_sms() CALLED → {masked_to}")

    client, from_number = _get_twilio()

    if client is None:
        err_msg = "Twilio credentials missing or unconfigured"
        safe_print(f"[SMS] SID=None")
        safe_print(f"[SMS] status=failed")
        safe_print(f"[SMS] error_code=CONFIG_MISSING")
        safe_print(f"[SMS] error_message={err_msg}")
        logger.error(f"[SMS] Cannot send SMS to {masked_to}: {err_msg}")
        return {
            "success": False,
            "delivery_mode": "REAL",
            "message_sid": None,
            "status": "failed",
            "error_code": "CONFIG_MISSING",
            "error": err_msg,
        }

    try:
        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_normalized,
        )
        safe_print(f"[SMS] SID={message.sid}")
        safe_print(f"[SMS] status={message.status}")
        safe_print(f"[SMS] error_code={message.error_code}")
        safe_print(f"[SMS] error_message={message.error_message}")
        logger.info(f"[SMS] SID={message.sid}, status={message.status}")
        return {
            "success": True,
            "delivery_mode": "REAL",
            "message_sid": message.sid,
            "status": message.status,
            "error_code": message.error_code,
            "error": None,
        }
    except Exception as e:
        err_code = getattr(e, "code", None) or getattr(e, "status", None)
        err_msg = getattr(e, "msg", None) or str(e)
        safe_print(f"[SMS] SID=None")
        safe_print(f"[SMS] status=failed")
        safe_print(f"[SMS] error_code={err_code}")
        safe_print(f"[SMS] error_message={err_msg}")
        logger.error(f"[SMS] Failed to send to {masked_to}: code={err_code} msg={err_msg}")
        return {
            "success": False,
            "delivery_mode": "REAL",
            "message_sid": None,
            "status": "failed",
            "error_code": err_code,
            "error": f"[{err_code}] {err_msg}" if err_code else err_msg,
        }
