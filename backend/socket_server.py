import socketio

from backend.config import settings

# Shared Socket.io server instance — imported by all handler modules
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.socketio_cors_origins.split(","),
    logger=True,
    engineio_logger=False,
)
