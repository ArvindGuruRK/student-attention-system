from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    # App
    app_env: str = "development"
    secret_key: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/attention_monitor"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # CV Thresholds
    yaw_threshold: float = 30.0
    pitch_threshold: float = 25.0
    no_face_seconds: float = 5.0
    distraction_seconds: float = 30.0
    attention_window_seconds: int = 60
    ema_alpha: float = 0.3

    # Alert Thresholds
    alert_threshold: int = 40
    warn_threshold: int = 60

    # Socket.io
    socketio_cors_origins: str = "http://localhost:3000"


settings = Settings()
