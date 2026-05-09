from app.schemas.user_schema import User_schema, UserCreate
from app.schemas.login_schema import LoginRequest, TokenResponse
from app.crud import crud_user
from app.core.security import create_access_token
from app.db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/", response_model=list[User_schema])
def get_users(db: Session = Depends(get_db)):
    users = crud_user.get_users(db)
    return users

@user_router.get("/{user_id}", response_model=User_schema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user_obj = crud_user.get_user(user_id, db)
    if user_obj is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user_obj

@user_router.post("/", response_model=User_schema, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    """
    Create a new user (Registration).
    """
    # 1. Check if the username already exists
    user = crud_user.get_user_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    # 2. Check if the email already exists
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )
    
    # 3. Capture client IP
    client_ip = request.client.host if request.client else None
    
    return crud_user.create_user(db, user_in=user_in, hashed_ip=client_ip)

@user_router.post("/login", response_model=TokenResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT access token.
    """
    user = crud_user.authenticate(db, username=login_in.username, password=login_in.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(subject=user.user_id)
    return TokenResponse(
        access_token=token,
        user_id=user.user_id,
        username=user.username,
    )