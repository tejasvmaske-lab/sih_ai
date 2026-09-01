import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    """Simple sha256 password hashing for demo prototype."""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/login", response_model=UserResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    """
    Role-isolated authentication endpoint.
    Strictly prevents Citizens from logging in through the Municipal Authority Admin portal.
    """
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    
    if not user:
        # Fallback helper for quick demo logins
        if req.email.strip().lower() == "admin@mc.gov.in" and req.password == "admin123":
            user = User(
                email="admin@mc.gov.in",
                username="admin_officer",
                hashed_password=hash_password("admin123"),
                role="admin",
                full_name="Officer Sharma",
                department="Municipal Corporation Grievance Cell"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif req.email.strip().lower() == "citizen@city.gov.in" and req.password == "citizen123":
            user = User(
                email="citizen@city.gov.in",
                username="citizen_user",
                hashed_password=hash_password("citizen123"),
                role="citizen",
                full_name="Tejas Citizen",
                department=""
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

    # Password check
    if user.hashed_password != hash_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # STRICT ROLE ACCESS CONTROL: Citizens MUST NOT log in via Admin Portal
    if req.portal_type == "admin" and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="⛔ Access Denied: Citizens cannot log in through the Municipal Corporation Admin portal. Please use the Citizen Portal login."
        )

    return user


@router.post("/register", response_model=UserResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    """
    Citizen registration endpoint.
    """
    existing = db.query(User).filter((User.email == req.email.strip().lower()) | (User.username == req.username.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists."
        )

    new_user = User(
        email=req.email.strip().lower(),
        username=req.username.strip(),
        hashed_password=hash_password(req.password),
        role="citizen",  # Self registration is strictly Citizen role
        full_name=req.full_name.strip(),
        department=""
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
