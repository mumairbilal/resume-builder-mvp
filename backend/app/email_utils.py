import base64
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"


class EmailNotConfigured(Exception):
    pass


def send_resume_email(to_email: str, subject: str, body_text: str, pdf_base64: str, filename: str) -> None:
    """Sends an email with a PDF attachment via SMTP.

    Requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD env vars to be set.
    If not configured, raises EmailNotConfigured so callers can respond gracefully.
    """
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise EmailNotConfigured(
            "SMTP is not configured on the server. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD env vars."
        )

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
