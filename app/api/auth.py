from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import authenticate_user, get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    from app.core.security import create_access_token

    user = authenticate_user(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_read = UserRead(
        id=user.id,
        email=user.email,
        role=user.role,
        display_name=user.display_name,
    )
    return LoginResponse(access_token=create_access_token(user), user=user_read)


@router.get("/me", response_model=UserRead)
def me(user: dict = Depends(get_current_user)) -> UserRead:
    return UserRead(
        id=user["id"],
        email=user["sub"],
        role=user["role"],
        display_name=user["display_name"],
    )
