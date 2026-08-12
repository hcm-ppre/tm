import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


def _creds():
    p = Path("/app/memory/test_credentials.md")
    content = p.read_text(encoding="utf-8")
    emails = re.findall(r"(?im)^\s*-\s*Email:\s*(\S+)", content)
    pwds = re.findall(r"(?im)^\s*-\s*Password:\s*(\S+)", content)
    return emails, pwds


@pytest.fixture(scope="session")
def admin_credentials():
    emails, pwds = _creds()
    if not emails:
        pytest.skip("no credentials found")
    return {"email": emails[0], "password": pwds[0]}


@pytest.fixture(scope="session")
def viewer_credentials():
    emails, pwds = _creds()
    if len(emails) < 2:
        pytest.skip("no viewer credentials found")
    return {"email": emails[1], "password": pwds[1]}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {creds['email']}: {r.status_code} {r.text[:300]}")
    return s, r


@pytest.fixture(scope="session")
def admin_client(admin_credentials):
    s, _ = _login(admin_credentials)
    return s


@pytest.fixture(scope="session")
def viewer_client(viewer_credentials):
    s, _ = _login(viewer_credentials)
    return s


@pytest.fixture(scope="session")
def anon_client():
    return requests.Session()
