"""DefenceIQ Production CORS and WebSocket Origin Verification Test Suite.

Validates that:
1. CORS preflight (OPTIONS) and actual requests from approved origins succeed:
   - http://localhost:5173
   - http://127.0.0.1:5173
   - https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app
2. CORS requests from unauthorized origins do not receive allow-origin headers.
3. allow_credentials is False.
4. WebSocket handshake from approved origins is accepted and streams events.
5. WebSocket handshake from unauthorized origins is rejected before accept (code 1008).
"""
import pytest
from starlette.testclient import TestClient
from main import app, ALLOWED_ORIGINS, is_allowed_origin

client = TestClient(app)

PRODUCTION_VERCEL_ORIGIN = "https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app"
LOCAL_DEV_ORIGIN = "http://localhost:5173"
LOCAL_IP_ORIGIN = "http://127.0.0.1:5173"
UNAUTHORIZED_ORIGIN = "https://malicious-attacker.com"

# ==============================================================================
# 1. CORS Preflight & Request Tests
# ==============================================================================

def test_cors_preflight_production_vercel():
    """Verify OPTIONS preflight request from the Vercel production deployment."""
    response = client.options(
        "/api/alerts",
        headers={
            "Origin": PRODUCTION_VERCEL_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == PRODUCTION_VERCEL_ORIGIN
    assert "GET" in response.headers.get("access-control-allow-methods", "")
    assert response.headers.get("access-control-allow-credentials") is None

def test_cors_preflight_localhost():
    """Verify OPTIONS preflight request from localhost development."""
    response = client.options(
        "/api/alerts",
        headers={
            "Origin": LOCAL_DEV_ORIGIN,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == LOCAL_DEV_ORIGIN

def test_cors_preflight_unauthorized_rejected():
    """Verify OPTIONS preflight request from an untrusted origin is denied CORS headers."""
    response = client.options(
        "/api/alerts",
        headers={
            "Origin": UNAUTHORIZED_ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") is None

def test_cors_get_alerts_allowed_origin():
    """Verify GET /api/alerts includes Access-Control-Allow-Origin header for approved origin."""
    response = client.get("/api/alerts", headers={"Origin": PRODUCTION_VERCEL_ORIGIN})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == PRODUCTION_VERCEL_ORIGIN
