"""Shared-secret header authentication for internal service-to-service calls.

Pure ASGI middleware (not BaseHTTPMiddleware) so it does not buffer or break
streaming responses such as MCP's SSE transport.

Behaviour:
  * secret configured  -> every request (except exempt paths) must carry the
    header with a matching value, compared in constant time; otherwise 401.
  * secret unset       -> fail closed: every non-exempt request gets 503.
    These services trust the student id they are given, so running them
    open would expose every student's records. Set the secret everywhere,
    local development included.
"""

import hmac
import json
import logging
from typing import Iterable

logger = logging.getLogger(__name__)


def secrets_match(provided: str | None, expected: str) -> bool:
    """Constant-time comparison; False for a missing/empty provided value."""
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


class SharedSecretMiddleware:
    def __init__(
        self,
        app,
        *,
        secret: str | None,
        header_name: str,
        env_var_name: str,
        service_name: str,
        exempt_paths: Iterable[str] = (),
    ):
        self.app = app
        self.secret = (secret or "").strip()
        self.header_name = header_name.lower().encode("latin-1")
        self.display_header = header_name
        self.exempt_paths = frozenset(exempt_paths)
        self.service_name = service_name

        self.env_var_name = env_var_name

        if not self.secret:
            logger.error(
                "!!! %s: %s is NOT set -- refusing all requests (503). "
                "Set %s (same value in the calling service). !!!",
                service_name,
                env_var_name,
                env_var_name,
            )

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] not in ("http", "websocket")
            or scope.get("path") in self.exempt_paths
        ):
            await self.app(scope, receive, send)
            return

        if not self.secret:
            await self._reject(scope, send, 503, "Service not configured")
            return

        provided = None
        for name, value in scope.get("headers") or []:
            if name == self.header_name:
                provided = value.decode("latin-1")
                break

        if secrets_match(provided, self.secret):
            await self.app(scope, receive, send)
            return

        logger.warning(
            "%s: rejected %s %s (invalid or missing %s header)",
            self.service_name,
            scope.get("method", scope["type"]),
            scope.get("path"),
            self.display_header,
        )
        await self._reject(scope, send, 401, "Unauthorized")

    async def _reject(self, scope, send, status: int, error: str):
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return

        body = json.dumps({"error": error}).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("latin-1")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
