from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.teacher import Teacher
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from backend.services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Create a new teacher account and return an access token."""
    existing = await db.execute(select(Teacher).where(Teacher.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    teacher = Teacher(email=body.email, hashed_password=hash_password(body.password), name=body.name)
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    return TokenResponse(
        access_token=create_access_token(str(teacher.id)),
        teacher_id=str(teacher.id),
        name=teacher.name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Authenticate a teacher and return a JWT access token."""
    result = await db.execute(select(Teacher).where(Teacher.email == body.email))
    teacher = result.scalar_one_or_none()
    if not teacher or not verify_password(body.password, teacher.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(str(teacher.id)),
        teacher_id=str(teacher.id),
        name=teacher.name,
    )
