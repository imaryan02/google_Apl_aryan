import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "AI Stadium Command Center API"
    API_V1_STR: str = "/api"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    
    # Fallback to local SQLite stadium.db if no PostgreSQL DATABASE_URL is set
    _db_url: str = os.getenv("DATABASE_URL", "sqlite:///./stadium.db")

    @property
    def DATABASE_URL(self) -> str:
        url = self._db_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
            
        if url.startswith("postgresql://"):
            # URL-encode the password to safely handle special characters like '@'
            prefix = "postgresql://"
            remaining = url[len(prefix):]
            r_at_index = remaining.rfind("@")
            if r_at_index != -1:
                credentials = remaining[:r_at_index]
                host_and_db = remaining[r_at_index:]
                if ":" in credentials:
                    username, password = credentials.split(":", 1)
                    encoded_password = urllib.parse.quote_plus(password)
                    return f"{prefix}{username}:{encoded_password}{host_and_db}"
        return url

settings = Settings()
