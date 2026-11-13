# DefenceIQ Production Deployment Guide

This guide documents the configuration and verification procedures for deploying DefenceIQ across **Vercel** (Frontend) and **Render** (Backend API & WebSocket Server).

---

## Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                                PRODUCTION TOPOLOGY                                |
+-----------------------------------------------------------------------------------+

 [ Analyst Browser / SOC Desk ]
             │
             ├──────────── HTTPS (Static SPA Assets) ────────────► [ Vercel Edge CDN ]
             │                                                     URL: https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app
             │                                                     Root: /frontend
             │                                                     Build: vite build (dist)
             │
             ├──────────── HTTPS (REST API Queries & Approvals) ─► [ Render Web Service ]
             │             Header: Origin: https://...vercel.app   URL: https://defenceiq-api.onrender.com
             │             CORS Middleware: allow_credentials=False Host: 0.0.0.0:$PORT
             │             Methods: GET, POST, OPTIONS             FastAPI: main:app
             │
             └──────────── WSS (Live Agent Trace Stream) ────────► [ Render Web Service ]
                           Header: Origin: https://...vercel.app   URL: wss://defenceiq-api.onrender.com/ws
                           RFC 6455 Origin Check: Code 1008        Endpoint: /ws
```

---

## 1. Backend Deployment (Render)

### Service Configuration
- **Environment**: Python 3.10+
- **Root Directory**: `.` (Repository root)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Environment Variables
Configure the following environment variables in the Render Dashboard (**Dashboard > Web Service > Environment**):

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `DEFENCEIQ_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app` | Comma-separated list of allowed HTTP and WebSocket origins |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic Claude API key for multi-agent reasoning |
| `PYTHONUNBUFFERED` | `1` | Real-time console log streaming |

### CORS Configuration in `main.py`
The backend registers `CORSMiddleware` on the primary FastAPI instance:
- Allowed Origins:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
  - `https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app`
  - Plus any origins provided in `DEFENCEIQ_ALLOWED_ORIGINS`
- Allowed Methods: `["*"]`
- Allowed Headers: `["*"]`
- `allow_credentials`: `False`

### WebSocket Origin Validation on `/ws`
The WebSocket handler inspects the incoming `Origin` HTTP header before accepting the socket:
```python
origin = websocket.headers.get("origin")
if not is_origin_allowed(origin):
    await websocket.close(code=1008)  # 1008: Policy Violation
    return
await websocket.accept()
```

---

## 2. Frontend Deployment (Vercel)

### Project Configuration
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 18.x or 20.x

### Environment Variables
Configure the following in the Vercel Dashboard (**Project Settings > Environment Variables**):

| Variable Name | Production Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE` | `https://defenceiq-api.onrender.com` | Base URL for REST API endpoints (`/api/alerts`, `/api/incidents`, etc.) |
| `VITE_WS_URL` | `wss://defenceiq-api.onrender.com/ws` | WebSocket endpoint for live investigation traces |

> **Automatic Fallback:** If `VITE_WS_URL` is omitted, `wsClient.ts` automatically converts `VITE_API_BASE` (`https://` to `wss://` and appends `/ws`).

---

## 3. Local Development Configuration

For local development against a local or remote backend:

1. Copy `.env.example` in `frontend/`:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
2. For local backend testing (default):
   ```env
   # Leave blank to use Vite's same-origin proxy to http://127.0.0.1:8000
   VITE_API_BASE=
   VITE_WS_URL=
   ```
3. For local frontend against production Render backend:
   ```env
   VITE_API_BASE=https://defenceiq-api.onrender.com
   VITE_WS_URL=wss://defenceiq-api.onrender.com/ws
   ```

---

## 4. Verification and Health Checks

### Preflight CORS Verification
```bash
curl -i -X OPTIONS https://defenceiq-api.onrender.com/api/alerts \
  -H "Origin: https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type"
```
Expected response:
```http
HTTP/1.1 200 OK
access-control-allow-origin: https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app
access-control-allow-methods: *
access-control-allow-headers: *
```

### WebSocket Origin Check Verification
Using `wscat` or a Python script:
- Allowed Origin (`https://defenceiq-5iazzx3nb-madhura-lakade-s-projects.vercel.app`): Connection accepted.
- Unauthorized Origin (`https://malicious-site.example.com`): Handshake closed immediately with code `1008` (Policy Violation).

### Running Automated Test Suite
```bash
pytest tests/test_cors_and_websocket.py -v
```
All 9 test cases must pass:
- Preflight CORS from production Vercel
- Preflight CORS from localhost:5173
- Preflight CORS rejection for unauthorized origin
- Direct GET CORS headers
- WebSocket connection allowed from Vercel
- WebSocket connection allowed from localhost
- WebSocket rejection with 1008 for unauthorized origin
- Dynamic origin support via `DEFENCEIQ_ALLOWED_ORIGINS`
- Single FastAPI instance assertion
