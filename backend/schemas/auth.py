from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Payload for POST /api/auth/login."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Payload for POST /api/auth/register."""
    email: EmailStr
    password: str
    name: str


class TokenResponse(BaseModel):
    """JWT response returned after successful login or registration."""
    access_token: str
    token_type: str = "bearer"
    teacher_id: str
    name: str
