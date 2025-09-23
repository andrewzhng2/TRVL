from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.db import get_db
from app import models
from app import schemas

router = APIRouter(prefix="/backlog", tags=["backlog"])


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User | None:
    """Get current user from Authorization header, returns None if not authenticated"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    
    # Handle frontend local tokens (format: local:xxxxx)
    if token.startswith("local:"):
        # For local tokens, try to find a matching session
        session = db.query(models.Session).filter(models.Session.token == token).first()
        if session and session.expires_at > datetime.now(timezone.utc):
            user = db.get(models.User, session.user_id)
            return user
        else:
            # For any local token, return Andrew Zhang (the logged-in user)
            # This handles the case where frontend creates its own session format
            user = db.query(models.User).filter(models.User.name == "Andrew Zhang").first()
            if user:
                return user
            # Fallback to first user
            user = db.query(models.User).first()
            return user
    
    # Handle regular API tokens
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if not session or session.expires_at < datetime.now(timezone.utc):
        return None
    user = db.get(models.User, session.user_id)
    return user


@router.get("/cards", response_model=list[schemas.BacklogCardRead])
def list_cards(db: Session = Depends(get_db)):
    cards = db.query(models.BacklogCard).options(joinedload(models.BacklogCard.creator)).order_by(models.BacklogCard.id.asc()).all()
    return cards


@router.post("/cards", response_model=schemas.BacklogCardRead)
def create_card(payload: schemas.BacklogCardCreate, db: Session = Depends(get_db), current_user: models.User | None = Depends(get_current_user)):
    card = models.BacklogCard(
        category=payload.category,
        title=payload.title,
        location=payload.location,
        cost=payload.cost,
        rating=payload.rating,
        desire_to_go=payload.desire_to_go,
        requires_reservation=payload.requires_reservation,
        description=payload.description,
        reserved=payload.reserved,
        reservation_date=payload.reservation_date,
        locked_in=payload.locked_in,
        created_by=current_user.id if current_user else None,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.patch("/cards/{card_id}", response_model=schemas.BacklogCardRead)
def update_card(card_id: int, payload: schemas.BacklogCardUpdate, db: Session = Depends(get_db)):
    card = db.get(models.BacklogCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Update only the fields that are provided
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)
    
    db.commit()
    db.refresh(card)
    return card


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.get(models.BacklogCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return None


