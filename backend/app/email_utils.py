import base64
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests

# --- Resend (HTTP API) — preferred ---
# Free hosting platforms (Railway/Render free tiers) often block outgoing
# SMTP ports (25/465/587) at the network level, so email sending fails with
# connection/auth errors even when the SMTP credentials themselves are
# correct. Resend sends over plain HTTPS (port 443), which is never
# blocked, so it's the reliable option in this kind of environment.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "onboarding@resend.dev")

# --- SMTP — fallback, only used if RESEND_API_KEY isn't set ---
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"


class EmailNotConfigured(Exception):
    pass


def send_resume_email(to_email: str, subject: str, body_text: str, pdf_base64: str, filename: str) -> None:
    """Sends an email with a PDF attachment.

    Uses Resend's HTTP API if RESEND_API_KEY is set (recommended — works
    reliably on Railway/Render free tiers). Falls back to SMTP if only the
    SMTP_* env vars are set. Raises EmailNotConfigured if neither is set.
    """
    if RESEND_API_KEY:
        _send_via_resend(to_email, subject, body_text, pdf_base64, filename)
        return

    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        _send_via_smtp(to_email, subject, body_text, pdf_base64, filename)
        return

    raise EmailNotConfigured(
        "Email is not configured on the server. Set RESEND_API_KEY (recommended), "
        "or SMTP_HOST/SMTP_USER/SMTP_PASSWORD as a fallback."
    )


def _send_via_resend(to_email: str, subject: str, body_text: str, pdf_base64: str, filename: str) -> None:
    # Resend wants the raw base64 (no "data:application/pdf;base64," prefix)
    raw_b64 = pdf_base64.split(",")[-1]

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": RESEND_FROM,
            "to": [to_email],
            "subject": subject,
            "text": body_text,
            "attachments": [
                {"filename": filename, "content": raw_b64}
            ],
        },
        timeout=20,
    )

    if response.status_code >= 400:
        # Surface Resend's own error message (e.g. unverified domain,
        # invalid API key) rather than a generic failure.
        try:
            detail = response.json().get("message", response.text)
        except ValueError:
            detail = response.text
        raise RuntimeError(f"Resend API error ({response.status_code}): {detail}")


def _send_via_smtp(to_email: str, subject: str, body_text: str, pdf_base64: str, filename: str) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(body_text, "plain"))

    pdf_bytes = base64.b64decode(pdf_base64.split(",")[-1])
    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(attachment)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [to_email], msg.as_string())
