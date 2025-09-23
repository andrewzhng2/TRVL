from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app import models
from app import schemas

router = APIRouter(prefix="/backlog", tags=["backlog"])


@router.get("/cards", response_model=list[schemas.BacklogCardRead])
def list_cards(db: Session = Depends(get_db)):
    cards = db.query(models.BacklogCard).order_by(models.BacklogCard.id.asc()).all()
    return cards


@router.post("/cards", response_model=schemas.BacklogCardRead)
def create_card(payload: schemas.BacklogCardCreate, db: Session = Depends(get_db)):
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


