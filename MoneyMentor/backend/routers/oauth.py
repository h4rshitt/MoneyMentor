import os
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db, User
from auth import get_password_hash, create_access_token
import httpx
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Google OAuth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _check_credentials():
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID == "your_google_client_id_here":
        raise HTTPException(
            status_code=501,
            detail="Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env"
        )


@router.get("/google")
def google_login():
    _check_credentials()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, db: Session = Depends(get_db)):
    """Handle Google OAuth callback — always redirects to frontend, never raises 500."""

    def _err(msg: str):
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={urllib.parse.quote(msg)}")

    if error or not code:
        return _err(error or "OAuth cancelled")

    try:
        _check_credentials()
    except HTTPException as e:
        return _err(e.detail)

    try:
        async with httpx.AsyncClient() as client:
            # Step 1 — exchange auth code for tokens
            body = urllib.parse.urlencode({
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            })
            token_res = await client.post(
                GOOGLE_TOKEN_URL,
                content=body.encode("utf-8"),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0,
            )
            if token_res.status_code != 200:
                try:
                    google_err = token_res.json()
                    detail = (
                        google_err.get("error_description")
                        or google_err.get("error")
                        or token_res.text[:200]
                    )
                except Exception:
                    detail = token_res.text[:200]
                return _err(f"Google OAuth error: {detail}")

            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return _err("No access token received from Google")

            # Step 2 — fetch user profile
            userinfo_res = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if userinfo_res.status_code != 200:
                return _err("Could not fetch Google user profile")
            userinfo = userinfo_res.json()

        google_email = userinfo.get("email")
        google_name = userinfo.get("name") or google_email
        google_sub = userinfo.get("sub", "unknown")
        google_picture = userinfo.get("picture", "")

        if not google_email:
            return _err("Google did not return an email address")

        # Step 3 — find or create user
        user = db.query(User).filter(User.email == google_email).first()
        if not user:
            placeholder_pw = get_password_hash(f"oauth_{google_sub}"[:72])
            user = User(
                name=google_name,
                email=google_email,
                hashed_password=placeholder_pw,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Step 4 — issue JWT and redirect to frontend
        jwt_token = create_access_token({"sub": user.email})
        params = urllib.parse.urlencode({
            "token": jwt_token,
            "name": user.name,
            "email": user.email,
            "picture": google_picture,
        })
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{params}")

    except Exception as e:
        return _err(f"Login failed: {str(e)[:150]}")
