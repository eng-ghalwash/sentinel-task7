from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sentinel Dashboard API"
    secret_key: str = "sentinel-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
