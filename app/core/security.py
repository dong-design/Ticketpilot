import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class DemoUser:
    id: int
    email: str
    password: str
    role: str
    display_name: str


DEMO_USERS = {
    "analyst@ticketpilot.dev": DemoUser(
        id=101, email="analyst@ticketpilot.dev", password="demo123", role="user", display_name="Avery Analyst"
    ),
    "reviewer@ticketpilot.dev": DemoUser(
        id=201, email="reviewer@ticketpilot.dev", password="demo123", role="reviewer", display_name="Riley Reviewer"
    ),
    "admin@ticketpilot.dev": DemoUser(
        id=301, email="admin@ticketpilot.dev", password="demo123", role="admin", display_name="Casey Admin"
    ),
}


def authenticate_user(email: str, password: str) -> DemoUser | None:
    user = DEMO_USERS.get(email.lower())
    if user is None or user.password != password:
        return None
    return user


def create_access_token(user: DemoUser, expires_in_seconds: int = 60 * 60 * 8) -> str:
    payload = {
        "sub": user.email,
        "id": user.id,
        "role": user.role,
        "display_name": user.display_name,
        "exp": int(time.time()) + expires_in_seconds,
    }
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _sign(body)
    return f"{body}.{signature}"


def decode_access_token(token: str) -> dict:
    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise _credentials_error() from exc

    expected_signature = _sign(body)
    if not hmac.compare_digest(signature, expected_signature):
        raise _credentials_error()

    payload = json.loads(_b64decode(body))
    if payload.get("exp", 0) < int(time.time()):
        raise _credentials_error("Token expired")
    return payload


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    if credentials is None:
        raise _credentials_error("Authentication required")
    return decode_access_token(credentials.credentials)


def require_roles(*roles: str):
    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency


def _sign(value: str) -> str:
    return hmac.new(settings.auth_secret_key.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode("utf-8")


def _credentials_error(message: str = "Invalid authentication credentials") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)
