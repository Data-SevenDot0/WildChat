import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User


def create_admin() -> User:
    db = SessionLocal()
    try:
        user = User(
            username="admin",
            email="admin@scouterfrc.local",
            hashed_password=get_password_hash("123"),
            user_ip="127.0.0.1",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Admin user created successfully.")
        return user
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

create_admin()