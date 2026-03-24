"""
report_sy_proxy.py
===================

This script demonstrates how to fetch and analyse an HTML form hosted on
``http://plat.damascus.gov.sy/complaint.html`` through an HTTP proxy
(`213.178.250.33:8080` or another Syrian proxy). After retrieving the page it
uses BeautifulSoup to locate the first form, extracts its fields, populates
them with example values and submits the form via a POST request. The
script prints diagnostic information about the form (method, action, and
field names) as well as the HTTP status of the submission.

If the site is unreachable through the proxy from your environment, the
script will raise an exception when attempting to fetch the page. In that
case you should verify connectivity to the proxy or run the script in an
environment where the proxy is reachable.
"""

from __future__ import annotations

import sys
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup  # type: ignore


def fetch_form_page(url: str, proxies: dict[str, str], timeout: float = 30.0) -> str:
    """Fetch the HTML content of ``url`` using the given proxies.

    :param url: URL of the page to retrieve.
    :param proxies: Proxy mapping for both ``http`` and ``https`` schemes.
    :param timeout: HTTP request timeout.
    :returns: Raw HTML text.
    :raises: requests.exceptions.RequestException if the request fails.
    """
    resp = requests.get(url, proxies=proxies, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def parse_first_form(html: str) -> tuple[dict[str, str], str, str]:
    """Parse the first form in the given HTML and return its fields, action and method.

    This function uses BeautifulSoup to locate the first ``<form>`` element in
    the HTML, extracts its ``action`` and ``method`` attributes, and prepares
    a dictionary of data with dummy values for each input/select/textarea.

    :param html: HTML content containing at least one form.
    :returns: A tuple ``(data, action_url, method)`` where ``data`` is a
              mapping of field names to dummy values, ``action_url`` is the
              (possibly relative) URL specified by the form's ``action``
              attribute (or the page URL if missing), and ``method`` is
              the form's submission method (defaulting to ``post``).
    :raises: ValueError if no form is found in the HTML.
    """
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form")
    if not form:
        raise ValueError("No form found in the HTML")

    action = form.get("action", "")
    method = form.get("method", "post").lower()

    data: dict[str, str] = {}

    # Handle input fields
    for inp in form.find_all("input"):
        name = inp.get("name")
        if not name:
            continue
        typ = inp.get("type", "text").lower()
        if typ in {"submit", "button", "reset"}:
            # Skip buttons
            continue
        elif typ == "number":
            data[name] = "1"
        elif typ in {"checkbox", "radio"}:
            # For checkbox/radio we set the value if the "value" attribute exists
            value = inp.get("value", "on")
            data[name] = value
        else:
            # text, email, tel, password, etc.
            data[name] = "test"

    # Handle textarea fields
    for textarea in form.find_all("textarea"):
        name = textarea.get("name")
        if not name:
            continue
        data[name] = "Test complaint message"

    # Handle select fields (choose the first option)
    for select in form.find_all("select"):
        name = select.get("name")
        if not name:
            continue
        # pick first option's value
        option = select.find("option")
        if option and option.get("value") is not None:
            data[name] = option.get("value") or ""
        else:
            data[name] = ""

    return data, action, method


def submit_form(url: str, proxies: dict[str, str]) -> None:
    """Fetch the form page, parse it and submit a dummy report.

    :param url: URL of the complaint form page.
    :param proxies: Proxy mapping for HTTP and HTTPS.
    """
    print(f"Fetching complaint form at {url} through proxy…")
    try:
        html = fetch_form_page(url, proxies)
    except Exception as exc:
        print(f"Failed to retrieve page: {exc}")
        return

    try:
        data, action, method = parse_first_form(html)
    except ValueError as err:
        print(err)
        return

    # Build full action URL
    action_url = urljoin(url, action) if action else url
    print(f"Detected form submission method: {method.upper()}")
    print(f"Form action URL: {action_url}")
    print("Fields to submit:")
    for k, v in data.items():
        print(f"  {k} = {v}")

    print("Submitting form…")
    try:
        if method == "post":
            resp = requests.post(action_url, data=data, proxies=proxies, timeout=30)
        else:
            resp = requests.get(action_url, params=data, proxies=proxies, timeout=30)
        print(f"Submission HTTP status: {resp.status_code}")
    except Exception as exc:
        print(f"Failed to submit form: {exc}")


def main() -> None:
    url = "http://plat.damascus.gov.sy/complaint.html"
    proxies = {
        "http": "http://213.178.250.33:8080",
        "https": "http://213.178.250.33:8080",
    }
    submit_form(url, proxies)


if __name__ == "__main__":
    main()
