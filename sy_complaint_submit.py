"""
sy_complaint_submit.py
======================

This script demonstrates how to submit a complaint to the "محلولة" portal
of Damascus governorate programmatically. It replicates the behaviour
implemented in the website's JavaScript: it sends a POST request to the
`/Bwork/BworkServlet` endpoint with the `ps-action` header set to
`PSDGovFastComplaint`. The body of the request is a multipart/form-data
payload containing a JSON-encoded `data` parameter and optionally
attachments for images or videos. The JSON structure must include
specific keys recognised by the backend.

Usage:
  python sy_complaint_submit.py --proxy http://193.43.159.200:80

If no proxy is supplied the request is sent directly. Because the
website appears to restrict access to Syrian IP ranges, you may need
to specify a working Syrian HTTP proxy using the `--proxy` argument.

Warning: The remote site may not be reachable from your current network
and the proxy addresses may no longer be valid. Use this script in a
controlled environment and respect the terms of service of the website.
"""

import argparse
import json
import os
from typing import Optional

import requests


# Endpoint for the complaint submission
ENDPOINT = 'http://plat.damascus.gov.sy/Bwork/BworkServlet'


def build_payload(full_name: str,
                  contact_number: str,
                  classification: int,
                  address: str,
                  subject: str,
                  recommendation: Optional[str] = None) -> dict:
    """Construct the JSON data object expected by the backend.

    :param full_name: complainant's full name
    :param contact_number: WhatsApp or phone number
    :param classification: integer code representing the complaint category
    :param address: detailed address of the complaint location
    :param subject: complaint description
    :param recommendation: optional recommendation text
    :returns: dictionary ready to be JSON-encoded
    """
    return {
        "FULL_NAME": full_name,
        "CONTACT_NUMBER": contact_number,
        "COMPLAINT_CLASSIFICATION": classification,
        "ADDRESS": address,
        "SUBJECT_OF_COMPLAINT": subject,
        "RECOMMENDATION_CHECK": bool(recommendation),
        "RECOMMENDATION": recommendation or "",
    }


def submit_complaint(data: dict, image_path: Optional[str] = None,
                     video_path: Optional[str] = None,
                     proxy: Optional[str] = None) -> requests.Response:
    """Submit the complaint via an HTTP POST request.

    :param data: dictionary of complaint fields
    :param image_path: optional path to an image file
    :param video_path: optional path to a video file
    :param proxy: optional proxy URL (e.g. 'http://193.43.159.200:80')
    :returns: requests.Response object
    :raises: requests.RequestException on network errors
    """
    proxies = None
    if proxy:
        proxies = {"http": proxy, "https": proxy}

    # Prepare multipart/form-data payload
    multipart_data = {}
    # The `data` field must be JSON-encoded and passed as a form field
    multipart_data['data'] = (None, json.dumps(data), 'application/json')

    # Attach image if provided
    files = {}
    if image_path and os.path.exists(image_path):
        ext = os.path.splitext(image_path)[1].lstrip('.')
        key = f'COMPLAINT_PIC.{ext}'
        files[key] = open(image_path, 'rb')
    if video_path and os.path.exists(video_path):
        ext = os.path.splitext(video_path)[1].lstrip('.')
        key = f'COMPLAINT_VIDEO.{ext}'
        files[key] = open(video_path, 'rb')

    headers = {
        'ps-action': 'PSDGovFastComplaint',
        # The original JS used 'ContentType' which is non‑standard; we set a proper
        # Content-Type for multipart/form-data via requests (it handles boundaries)
    }

    # Use requests to encode multipart data correctly
    response = requests.post(
        ENDPOINT,
        files={**multipart_data, **files},
        headers=headers,
        proxies=proxies,
        timeout=30
    )
    return response


def main() -> None:
    parser = argparse.ArgumentParser(description='Submit a complaint to plat.damascus.gov.sy')
    parser.add_argument('--proxy', help='HTTP proxy URL (e.g., http://193.43.159.200:80)')
    parser.add_argument('--image', help='Path to an image file to attach')
    parser.add_argument('--video', help='Path to a video file to attach')
    parser.add_argument('--fullname', default='اختبار اسم', help='Your full name in Arabic')
    parser.add_argument('--phone', default='0999999999', help='WhatsApp/phone number')
    parser.add_argument('--classification', type=int, default=12, help='Complaint classification code (1-15)')
    parser.add_argument('--address', default='دمشق، سوريا', help='Detailed address of the complaint location')
    parser.add_argument('--subject', default='هذه رسالة شكوى تجريبية', help='Subject of the complaint')
    parser.add_argument('--recommendation', default='', help='Optional recommendation text')

    args = parser.parse_args()

    complaint_data = build_payload(
        full_name=args.fullname,
        contact_number=args.phone,
        classification=args.classification,
        address=args.address,
        subject=args.subject,
        recommendation=args.recommendation or None
    )

    try:
        resp = submit_complaint(
            data=complaint_data,
            image_path=args.image,
            video_path=args.video,
            proxy=args.proxy
        )
        print('HTTP status:', resp.status_code)
        print('Response body:', resp.text)
    except Exception as exc:
        print('Error during submission:', exc)


if __name__ == '__main__':
    main()
