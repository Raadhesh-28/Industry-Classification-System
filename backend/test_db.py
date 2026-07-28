from sqlalchemy import create_engine, text
from core.config import settings
from models.models import Base

def test_db():
    print(f"Connecting to {settings.DATABASE_URL}...")
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            print("Connected! Creating tables...")
            Base.metadata.create_all(bind=engine)
            print("Tables created successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_db()
