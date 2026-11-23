from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings


def _build_engine_kwargs(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    # Cloud Postgres (Neon / Supabase) scales to zero or drops idle pool connections.
    # pool_pre_ping validates connections before checkout; TCP keepalives prevent silent SSL drops.
    return {
        "pool_pre_ping": True,
        "pool_recycle": 240,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    }


engine = create_engine(settings.DATABASE_URL, **_build_engine_kwargs(settings.DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
