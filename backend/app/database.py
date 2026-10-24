import os, shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLED_DB = os.path.join(BASE_DIR, "housing.db")

# In Vercel serverless environments, the deployment directory is read-only.
# We copy the bundled SQLite database to /tmp so runtime writes succeed.
if os.getenv("VERCEL"):
    TMP_DB = "/tmp/housing.db"
    if not os.path.exists(TMP_DB) and os.path.exists(BUNDLED_DB):
        try:
            shutil.copyfile(BUNDLED_DB, TMP_DB)
        except Exception as e:
            print(f"Error copying bundled db to /tmp: {e}")
    DEFAULT_DB_URL = f"sqlite:///{TMP_DB}"
else:
    DEFAULT_DB_URL = f"sqlite:///{BUNDLED_DB}"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
