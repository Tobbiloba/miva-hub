"""Connection settings for calling the Study Buddy API from other services."""

import os

STUDY_BUDDY_SECRET_HEADER = "X-Internal-Secret"


def _resolve_base_url() -> str:
    # STUDY_BUDDY_API_URL is canonical; STUDY_BUDDY_API_BASE is the legacy name
    # used in render.yaml. Localhost is the local-development default only.
    url = (
        os.getenv("STUDY_BUDDY_API_URL")
        or os.getenv("STUDY_BUDDY_API_BASE")
        or "http://localhost:8083"
    ).strip()
    # Render's fromService host/hostport values come without a scheme.
    if "://" not in url:
        url = f"http://{url}"
    return url.rstrip("/")


STUDY_BUDDY_API_BASE = _resolve_base_url()


def study_buddy_headers() -> dict[str, str]:
    """Headers every request to the Study Buddy API must carry."""
    secret = os.getenv("STUDY_BUDDY_SHARED_SECRET", "").strip()
    return {STUDY_BUDDY_SECRET_HEADER: secret} if secret else {}
