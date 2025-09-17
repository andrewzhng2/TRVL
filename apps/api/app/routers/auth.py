from datetime import datetime, timedelta, timezone
import os
import secrets
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app import models
from app import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def verify_google_id_token(id_token: str) -> dict:
    # Use tokeninfo endpoint for simplicity; for production move to google-auth lib
    r = requests.get(GOOGLE_TOKENINFO_URL, params={"id_token": id_token}, timeout=10)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    data = r.json()
    # Optionally check audience if we have CLIENT_ID
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if client_id and data.get("aud") != client_id:
        raise HTTPException(status_code=401, detail="Token audience mismatch")
    return data


@router.post("/google", response_model=schemas.SessionRead)
def login_google(payload: schemas.GoogleLoginPayload, response: Response, db: Session = Depends(get_db)):
    data = verify_google_id_token(payload.id_token)
    google_sub = data.get("sub")
    email = data.get("email")
    name = data.get("name") or ""
    picture = data.get("picture") or ""
    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Missing fields in Google token")

    user = db.query(models.User).filter(models.User.google_sub == google_sub).first()
    if not user:
        user = models.User(google_sub=google_sub, email=email, name=name, picture=picture)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update latest profile info
        user.name = name
        user.picture = picture
        user.updated_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = models.Session(user_id=user.id, token=token, expires_at=expires_at)
    db.add(session)
    db.commit()

    return schemas.SessionRead(token=token, user=user)  # cookie optional, keeping simple for now


@router.get("/me", response_model=schemas.UserRead)
def me(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(models.User, session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return {"ok": True}
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if session:
        db.delete(session)
        db.commit()
    return {"ok": True}


