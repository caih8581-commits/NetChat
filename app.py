from datetime import datetime
from pathlib import Path
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="NetChat Networking Lab", version="1.0.0")
BASE_DIR = Path(__file__).resolve().parent

# In-memory connections are sufficient for this classroom demonstration.
clients: dict[WebSocket, str] = {}
send_locks: dict[WebSocket, asyncio.Lock] = {}


async def safe_send(websocket: WebSocket, payload: dict) -> bool:
    """Send one JSON message without overlapping writes to the same socket."""
    lock = send_locks.get(websocket)
    if lock is None:
        return False

    try:
        async with lock:
            await websocket.send_json(payload)
        return True
    except Exception:
        return False


async def broadcast(payload: dict) -> None:
    """Broadcast a JSON payload to all currently registered clients."""
    failed = []

    for websocket in list(clients):
        if not await safe_send(websocket, payload):
            failed.append(websocket)

    # Remove stale connections. Their endpoint cleanup may already be running.
    for websocket in failed:
        clients.pop(websocket, None)
        send_locks.pop(websocket, None)


async def broadcast_online_count() -> None:
    await broadcast({
        "type": "online",
        "count": len(clients),
    })


@app.get("/")
async def home():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/health")
async def health():
    return JSONResponse({
        "status": "ok",
        "connected_clients": len(clients),
    })


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str = "Guest"):
    username = (username or "Guest").strip()[:20] or "Guest"

    await websocket.accept()
    clients[websocket] = username
    send_locks[websocket] = asyncio.Lock()

    await broadcast({
        "type": "system",
        "text": f"{username} joined the room.",
        "time": datetime.now().strftime("%H:%M:%S"),
    })
    await broadcast_online_count()

    try:
        while True:
            data = await websocket.receive_json()

            if not isinstance(data, dict):
                continue

            message_type = data.get("type")

            if message_type == "ping":
                await safe_send(websocket, {
                    "type": "pong",
                    "id": data.get("id"),
                })

            elif message_type == "chat":
                message_text = str(data.get("text", "")).strip()

                if not message_text:
                    continue

                # The username is assigned by the server at connection time.
                await broadcast({
                    "type": "chat",
                    "username": clients.get(websocket, username),
                    "text": message_text[:500],
                    "time": datetime.now().strftime("%H:%M:%S"),
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        # A malformed frame or unexpected disconnect should not crash the server.
        pass
    finally:
        was_registered = websocket in clients
        clients.pop(websocket, None)
        send_locks.pop(websocket, None)

        if was_registered:
            await broadcast({
                "type": "system",
                "text": f"{username} left the room.",
                "time": datetime.now().strftime("%H:%M:%S"),
            })
            await broadcast_online_count()
