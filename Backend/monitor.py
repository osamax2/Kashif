#!/usr/bin/env python3
"""
Kashif Backend Monitoring & Alerting Script
============================================
Checks all microservice health endpoints and sends email alerts when services go down.
Designed to run via cron every 2 minutes on the production server.

Usage:
  # Manual run:
  python3 monitor.py

  # cron (every 2 minutes):
  */2 * * * * cd /root/Kashif/Backend && python3 monitor.py >> /var/log/kashif-monitor.log 2>&1
"""

import json
import os
import smtplib
import sys
import time
import urllib.request
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ============================================================
# CONFIGURATION
# ============================================================
SERVICES = {
    "auth":         "http://localhost:8000/api/monitoring/auth",
    "reporting":    "http://localhost:8000/api/monitoring/reporting",
    "gamification": "http://localhost:8000/api/monitoring/gamification",
    "coupons":      "http://localhost:8000/api/monitoring/coupons",
    "notification": "http://localhost:8000/api/monitoring/notification",
    "gateway":      "http://localhost:8000/health",
}

# SMTP settings (same as notification-service)
SMTP_HOST = os.getenv("SMTP_HOST", "mail.kashifroad.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "noreply@kashifroad.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "SecurePass123!")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@kashifroad.com")
ALERT_RECIPIENTS = os.getenv("ALERT_RECIPIENTS", "admin@kashif.com").split(",")

# State file to track previous status (avoid alert spam)
STATE_FILE = "/tmp/kashif_monitor_state.json"
TIMEOUT_SECONDS = 10


def load_state() -> dict:
    """Load previous monitoring state."""
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_state(state: dict):
    """Save current monitoring state."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def check_service(name: str, url: str) -> dict:
    """Check a single service health endpoint."""
    start = time.time()
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            response_ms = round((time.time() - start) * 1000, 2)
            body = resp.read().decode("utf-8")
            status_code = resp.getcode()

            # Try to parse JSON response
            try:
                data = json.loads(body)
                service_status = data.get("status", "healthy" if status_code == 200 else "unhealthy")
            except json.JSONDecodeError:
                service_status = "healthy" if status_code == 200 else "unhealthy"
                data = {"raw": body}

            return {
                "status": service_status,
                "response_ms": response_ms,
                "status_code": status_code,
                "details": data,
            }
    except Exception as e:
        response_ms = round((time.time() - start) * 1000, 2)
        return {
            "status": "unreachable",
            "response_ms": response_ms,
            "error": str(e),
        }


def send_alert_email(subject: str, body_html: str):
    """Send alert email via SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Kashif Monitor <{SMTP_FROM}>"
        msg["To"] = ", ".join(ALERT_RECIPIENTS)
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, ALERT_RECIPIENTS, msg.as_string())
        print(f"[ALERT] Email sent to {ALERT_RECIPIENTS}")
    except Exception as e:
        print(f"[ERROR] Failed to send alert email: {e}", file=sys.stderr)


def build_alert_html(failed_services: dict, recovered_services: dict) -> str:
    """Build HTML email body for alert."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    rows = ""

    for name, result in failed_services.items():
        error = result.get("error", "Unknown")
        rows += f"""
        <tr style="background:#ffe0e0">
            <td style="padding:8px;border:1px solid #ddd">🔴 {name}</td>
            <td style="padding:8px;border:1px solid #ddd">{result['status']}</td>
            <td style="padding:8px;border:1px solid #ddd">{result['response_ms']}ms</td>
            <td style="padding:8px;border:1px solid #ddd">{error}</td>
        </tr>"""

    for name, result in recovered_services.items():
        rows += f"""
        <tr style="background:#e0ffe0">
            <td style="padding:8px;border:1px solid #ddd">🟢 {name}</td>
            <td style="padding:8px;border:1px solid #ddd">recovered</td>
            <td style="padding:8px;border:1px solid #ddd">{result['response_ms']}ms</td>
            <td style="padding:8px;border:1px solid #ddd">-</td>
        </tr>"""

    return f"""
    <html><body style="font-family:Arial,sans-serif">
    <h2>⚠️ Kashif Service Alert</h2>
    <p>Time: {now}</p>
    <table style="border-collapse:collapse;width:100%">
    <tr style="background:#f0f0f0">
        <th style="padding:8px;border:1px solid #ddd">Service</th>
        <th style="padding:8px;border:1px solid #ddd">Status</th>
        <th style="padding:8px;border:1px solid #ddd">Response</th>
        <th style="padding:8px;border:1px solid #ddd">Error</th>
    </tr>
    {rows}
    </table>
    <p style="color:#888;font-size:12px">Kashif Monitoring System — api.kashifroad.com</p>
    </body></html>"""


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    prev_state = load_state()
    current_state = {}
    results = {}

    print(f"\n{'='*60}")
    print(f"[{now}] Kashif Monitoring Check")
    print(f"{'='*60}")

    # Check all services
    for name, url in SERVICES.items():
        result = check_service(name, url)
        results[name] = result
        current_state[name] = result["status"]

        icon = "✅" if result["status"] == "healthy" else "❌"
        print(f"  {icon} {name:15s} → {result['status']:12s} ({result['response_ms']}ms)")

    # Determine status changes
    failed_services = {}
    recovered_services = {}

    for name, status in current_state.items():
        prev = prev_state.get(name, "healthy")
        if status != "healthy" and prev == "healthy":
            # Service just went down
            failed_services[name] = results[name]
        elif status == "healthy" and prev != "healthy":
            # Service recovered
            recovered_services[name] = results[name]

    # Send alert if there are state changes
    if failed_services or recovered_services:
        subject_parts = []
        if failed_services:
            subject_parts.append(f"🔴 {len(failed_services)} DOWN")
        if recovered_services:
            subject_parts.append(f"🟢 {len(recovered_services)} recovered")
        subject = f"[Kashif] {' | '.join(subject_parts)}"

        body = build_alert_html(failed_services, recovered_services)
        send_alert_email(subject, body)
    else:
        all_healthy = all(s == "healthy" for s in current_state.values())
        if all_healthy:
            print("  ✅ All services healthy — no alerts needed")
        else:
            unhealthy = [n for n, s in current_state.items() if s != "healthy"]
            print(f"  ⚠️  Still unhealthy: {', '.join(unhealthy)} (alert already sent)")

    # Save state for next run
    save_state(current_state)

    # Write monitoring data as JSON for the admin dashboard API
    monitor_data = {
        "timestamp": now,
        "services": results,
        "overall": "healthy" if all(s == "healthy" for s in current_state.values()) else "degraded",
    }
    with open("/tmp/kashif_monitor_latest.json", "w") as f:
        json.dump(monitor_data, f, indent=2)


if __name__ == "__main__":
    main()
