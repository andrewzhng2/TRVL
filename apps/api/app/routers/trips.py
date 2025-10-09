from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app import models, schemas
from typing import List

router = APIRouter(prefix="/trips", tags=["trips"])
# Schedule endpoints
@router.get("/{trip_id}/schedule", response_model=List[schemas.ScheduledEventRead])
def list_schedule(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    items = (
        db.query(models.ScheduledEvent)
        .filter(models.ScheduledEvent.trip_id == trip_id)
        .all()
    )
    return items


@router.post("/{trip_id}/schedule", response_model=List[schemas.ScheduledEventRead])
def overwrite_schedule(trip_id: int, payload: List[schemas.ScheduledEventCreate], db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Clear and replace atomically
    db.query(models.ScheduledEvent).filter(models.ScheduledEvent.trip_id == trip_id).delete()
    for item in payload:
        db.add(models.ScheduledEvent(
            trip_id=trip_id,
            card_id=item.card_id,
            day_index=item.day_index,
            hour=item.hour,
        ))
    db.commit()
    items = (
        db.query(models.ScheduledEvent)
        .filter(models.ScheduledEvent.trip_id == trip_id)
        .all()
    )
    return items


@router.get("/", response_model=list[schemas.TripRead])
def list_trips(db: Session = Depends(get_db)):
    trips = db.query(models.Trip).order_by(models.Trip.created_at.desc()).all()
    return trips


@router.post("/", response_model=schemas.TripRead)
def create_trip(payload: schemas.TripCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Trip name required")
    trip = models.Trip(name=payload.name.strip(), start_date=payload.start_date, end_date=payload.end_date)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    # Seed sections
    for kind in ("backlog", "schedule", "travel", "packing"):
        db.add(models.TripSection(trip_id=trip.id, kind=kind))
    db.commit()
    return trip


@router.patch("/{trip_id}", response_model=schemas.TripRead)
def update_trip(trip_id: int, payload: schemas.TripUpdate, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Trip name required")
        trip.name = payload.name.strip()
    if payload.start_date is not None:
        trip.start_date = payload.start_date
    if payload.end_date is not None:
        trip.end_date = payload.end_date
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}


# Trip Legs endpoints
@router.get("/{trip_id}/legs", response_model=list[schemas.TripLegRead])
def list_trip_legs(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    legs = db.query(models.TripLeg).filter(models.TripLeg.trip_id == trip_id).order_by(models.TripLeg.order_index).all()
    return legs


@router.post("/{trip_id}/legs", response_model=schemas.TripLegRead)
def create_trip_leg(trip_id: int, payload: schemas.TripLegCreate, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Leg name required")
    
    # Get the next order index
    max_order = db.query(models.TripLeg).filter(models.TripLeg.trip_id == trip_id).count()
    
    leg = models.TripLeg(
        trip_id=trip_id,
        name=payload.name.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        order_index=payload.order_index if payload.order_index is not None else max_order
    )
    db.add(leg)
    db.commit()
    db.refresh(leg)
    return leg


@router.patch("/{trip_id}/legs/{leg_id}", response_model=schemas.TripLegRead)
def update_trip_leg(trip_id: int, leg_id: int, payload: schemas.TripLegUpdate, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    leg = db.get(models.TripLeg, leg_id)
    if not leg or leg.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Trip leg not found")
    
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Leg name required")
        leg.name = payload.name.strip()
    if payload.start_date is not None:
        leg.start_date = payload.start_date
    if payload.end_date is not None:
        leg.end_date = payload.end_date
    if payload.order_index is not None:
        leg.order_index = payload.order_index
    
    db.add(leg)
    db.commit()
    db.refresh(leg)
    return leg


@router.delete("/{trip_id}/legs/{leg_id}")
def delete_trip_leg(trip_id: int, leg_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    leg = db.get(models.TripLeg, leg_id)
    if not leg or leg.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Trip leg not found")
    
    db.delete(leg)
    db.commit()
    return {"message": "Trip leg deleted successfully"}


