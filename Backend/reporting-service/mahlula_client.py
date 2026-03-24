"""
mahlula_client.py
=================
Forwards Kashif pothole reports in Damascus to the "محلولة" (Mahlula)
government portal at plat.damascus.gov.sy.

Damascus boundary check:
  Latitude  33.45 – 33.58
  Longitude 36.20 – 36.40

The portal requires a Syrian IP, so requests are routed through a
SOCKS5 proxy configured via MAHLULA_PROXY env var.

Images are resized to ≤800px and ≤300KB before upload to work with
slow proxy connections.
"""
import asyncio
import io
import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Portal endpoint
MAHLULA_ENDPOINT = "https://plat.damascus.gov.sy/Bwork/BworkServlet"

# Proxy (SOCKS5) – e.g. socks5://193.43.159.144:1080
MAHLULA_PROXY = os.getenv("MAHLULA_PROXY", "")

# Damascus bounding box
DAMASCUS_LAT_MIN = 33.45
DAMASCUS_LAT_MAX = 33.58
DAMASCUS_LNG_MIN = 36.20
DAMASCUS_LNG_MAX = 36.40

# Kashif category_id → Mahlula classification mapping
# Mahlula classification 12 is the general infrastructure/road category
CATEGORY_CLASSIFICATION_MAP = {
    1: 12,  # Pothole → 12
    2: 12,  # Road damage → 12
    3: 12,  # Default mapping
}
DEFAULT_CLASSIFICATION = 12

MAX_RETRIES = 4
RETRY_DELAY = 5  # seconds
TIMEOUT = 45  # seconds


def is_damascus(latitude: float, longitude: float) -> bool:
    """Check if coordinates fall within Damascus city bounds."""
    return (
        DAMASCUS_LAT_MIN <= latitude <= DAMASCUS_LAT_MAX
        and DAMASCUS_LNG_MIN <= longitude <= DAMASCUS_LNG_MAX
    )


def _resize_image(image_bytes: bytes, max_dim: int = 800, max_size: int = 300_000) -> bytes:
    """Resize image to fit within max dimensions and file size.
    
    Uses basic JPEG re-encoding. If Pillow is not available,
    returns the original bytes.
    """
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        # Convert RGBA → RGB for JPEG
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        # Resize if needed
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        # Save with decreasing quality until under max_size
        for quality in (80, 60, 40):
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality)
            data = buf.getvalue()
            if len(data) <= max_size:
                return data
        return data  # return lowest quality result
    except ImportError:
        logger.warning("Pillow not installed – sending original image to Mahlula")
        return image_bytes


def _build_payload(
    latitude: float,
    longitude: float,
    description: str,
    category_id: int,
    address: str = "",
    phone: str = "0000000000",
    full_name: str = "",
) -> dict:
    """Build the JSON data object for the Mahlula portal."""
    classification = CATEGORY_CLASSIFICATION_MAP.get(category_id, DEFAULT_CLASSIFICATION)
    maps_link = f"https://www.google.com/maps?q={latitude},{longitude}"
    subject = f"{description} - كاشف لمراقبة الطرق - {maps_link}"

    sender_name = "كاشف - نظام مراقبة الطرق"
    if full_name:
        sender_name = f"{sender_name} - {full_name}"

    return {
        "FULL_NAME": sender_name,
        "CONTACT_NUMBER": phone,
        "COMPLAINT_CLASSIFICATION": classification,
        "ADDRESS": address or f"دمشق، سوريا - إحداثيات: {latitude}, {longitude}",
        "SUBJECT_OF_COMPLAINT": subject,
        "RECOMMENDATION_CHECK": False,
        "RECOMMENDATION": "",
    }


async def forward_to_mahlula(
    latitude: float,
    longitude: float,
    description: str,
    category_id: int,
    image_path: Optional[str] = None,
    address: str = "",
    phone: str = "0000000000",
    full_name: str = "",
) -> Optional[str]:
    """
    Forward a report to the Mahlula portal.

    Returns the complaint number (e.g. "99-004172") on success,
    or None on failure.
    """
    if not MAHLULA_PROXY:
        logger.warning("MAHLULA_PROXY not configured – skipping Mahlula forwarding")
        return None

    if not is_damascus(latitude, longitude):
        return None

    data = _build_payload(latitude, longitude, description, category_id, address, phone, full_name)

    # Prepare multipart fields
    files = {
        "data": (None, json.dumps(data), "application/json"),
    }

    # Attach image if available
    if image_path and os.path.exists(image_path):
        try:
            with open(image_path, "rb") as f:
                raw = f.read()
            resized = _resize_image(raw)
            files["COMPLAINT_PIC.jpeg"] = ("photo.jpeg", resized, "image/jpeg")
            logger.info(f"Mahlula: image attached ({len(resized)} bytes)")
        except Exception as e:
            logger.warning(f"Mahlula: failed to read image {image_path}: {e}")

    headers = {
        "ps-action": "PSDGovFastComplaint",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Use httpx-socks for SOCKS5 proxy support
            transport = None
            if MAHLULA_PROXY.startswith("socks"):
                from httpx_socks import AsyncProxyTransport
                transport = AsyncProxyTransport.from_url(MAHLULA_PROXY)

            async with httpx.AsyncClient(
                transport=transport,
                timeout=TIMEOUT,
                verify=False,  # Syrian gov cert may not be in trust store
            ) as client:
                resp = await client.post(
                    MAHLULA_ENDPOINT,
                    files=files,
                    headers=headers,
                )

            if resp.status_code == 200:
                result = resp.json()
                complaint_no = result.get("no", "unknown")
                logger.info(
                    f"✅ Mahlula: complaint {complaint_no} submitted "
                    f"(lat={latitude}, lng={longitude}, attempt={attempt})"
                )
                return complaint_no
            else:
                logger.warning(
                    f"Mahlula: HTTP {resp.status_code} on attempt {attempt}: {resp.text[:200]}"
                )
                last_error = f"HTTP {resp.status_code}"

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Mahlula: attempt {attempt}/{MAX_RETRIES} failed: {e}")

        if attempt < MAX_RETRIES:
            await asyncio.sleep(RETRY_DELAY)

    logger.error(f"❌ Mahlula: all {MAX_RETRIES} attempts failed. Last error: {last_error}")
    return None
