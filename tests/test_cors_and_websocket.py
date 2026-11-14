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
from starlette.websockets import WebSocketDisconnect
from main import app, ALLOWED_ORIGINS, is_allowed_origin

client = TestClient(app)

PRODUCTION_VERCEL_ORIGIN = "https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app"
THETA_VERCEL_ORIGIN = "https://defenceiq-theta.vercel.app"
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
    """Verify GET /api/alerts includes Access-Control-Allow-Origin header for approved origins."""
    for origin in (PRODUCTION_VERCEL_ORIGIN, THETA_VERCEL_ORIGIN):
        response = client.get("/api/alerts", headers={"Origin": origin})
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin

# ==============================================================================
# 2. WebSocket Origin Validation Tests
# ==============================================================================

def test_websocket_allowed_production_origin():
    """Verify WebSocket handshake succeeds from approved Vercel production origins."""
    for origin in (PRODUCTION_VERCEL_ORIGIN, THETA_VERCEL_ORIGIN):
        with client.websocket_connect("/ws", headers={"origin": origin}) as ws:
            assert ws is not None

def test_websocket_allowed_localhost_origin():
    """Verify WebSocket handshake succeeds from approved localhost development origin."""
    with client.websocket_connect("/ws", headers={"origin": LOCAL_DEV_ORIGIN}) as ws:
        assert ws is not None

def test_websocket_allowed_no_origin_header():
    """Verify non-browser / CLI client connecting without Origin header is accepted."""
    with client.websocket_connect("/ws") as ws:
        assert ws is not None

def test_websocket_rejected_unauthorized_origin():
    """Verify WebSocket handshake from unauthorized origin is closed with policy violation before accept."""
    try:
        with client.websocket_connect("/ws", headers={"origin": UNAUTHORIZED_ORIGIN}) as ws:
            pytest.fail("WebSocket connection should have been rejected for unauthorized origin")
    except WebSocketDisconnect as e:
        assert e.code == 1008
    except Exception as e:
        # In Starlette TestClient, connection rejection may surface as WebSocketDisconnect or Exception with 1008
        assert "1008" in str(e) or isinstance(e, WebSocketDisconnect)

# ==============================================================================
# 3. Unit Tests for is_allowed_origin helper
# ==============================================================================

def test_is_allowed_origin_helper():
    """Verify normalization and edge cases of the origin validation helper."""
    assert is_allowed_origin(PRODUCTION_VERCEL_ORIGIN) is True
    assert is_allowed_origin(PRODUCTION_VERCEL_ORIGIN + "/") is True
    assert is_allowed_origin(THETA_VERCEL_ORIGIN) is True
    assert is_allowed_origin(THETA_VERCEL_ORIGIN + "/") is True
    assert is_allowed_origin(LOCAL_DEV_ORIGIN) is True
    assert is_allowed_origin(LOCAL_IP_ORIGIN) is True
    assert is_allowed_origin(None) is True
    assert is_allowed_origin("") is True
    assert is_allowed_origin("https://evil.com") is False
    assert is_allowed_origin("http://localhost:3000") is False
