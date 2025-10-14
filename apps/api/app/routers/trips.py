from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.db import get_db
from app import models, schemas
from typing import List

router = APIRouter(prefix="/trips", tags=["trips"])


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User | None:
    """Resolve the current user from the Authorization header, or None if unauthenticated.
    This version does not do any special dev fallbacks.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    # Allow local tokens only when explicitly configured
    if token.startswith("local:"):
        session = db.query(models.Session).filter(models.Session.token == token).first()
        if session and session.expires_at > datetime.now(timezone.utc):
            return db.get(models.User, session.user_id)
        return None
    session = db.query(models.Session).filter(models.Session.token == token).first()
    if not session or session.expires_at < datetime.now(timezone.utc):
        return None
    return db.get(models.User, session.user_id)
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
    trips = (
        db.query(models.Trip)
        .options(joinedload(models.Trip.creator))
        .order_by(models.Trip.created_at.desc())
        .all()
    )
    return trips


@router.post("/", response_model=schemas.TripRead)
def create_trip(payload: schemas.TripCreate, db: Session = Depends(get_db), current_user: models.User | None = Depends(get_current_user)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Trip name required")
    trip = models.Trip(
        name=payload.name.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by=current_user.id if current_user else None,
    )
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


# Travel Segments endpoints
@router.get("/{trip_id}/travel", response_model=list[schemas.TravelSegmentRead])
def list_travel_segments(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    items = (
        db.query(models.TravelSegment)
        .filter(models.TravelSegment.trip_id == trip_id)
        .order_by(models.TravelSegment.order_index)
        .all()
    )
    return items


@router.post("/{trip_id}/travel", response_model=schemas.TravelSegmentRead)
def create_travel_segment(trip_id: int, payload: schemas.TravelSegmentCreate, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    seg = models.TravelSegment(
        trip_id=trip_id,
        edge_type=payload.edge_type,
        order_index=payload.order_index,
        transport_type=payload.transport_type,
        from_leg_id=payload.from_leg_id,
        to_leg_id=payload.to_leg_id,
        title=payload.title or "",
        badge=payload.badge or "",
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.patch("/{trip_id}/travel/{segment_id}", response_model=schemas.TravelSegmentRead)
def update_travel_segment(trip_id: int, segment_id: int, payload: schemas.TravelSegmentUpdate, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    seg = db.get(models.TravelSegment, segment_id)
    if not seg or seg.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Travel segment not found")
    if payload.edge_type is not None:
        seg.edge_type = payload.edge_type
    if payload.order_index is not None:
        seg.order_index = payload.order_index
    if payload.transport_type is not None:
        seg.transport_type = payload.transport_type
    if payload.from_leg_id is not None:
        seg.from_leg_id = payload.from_leg_id
    if payload.to_leg_id is not None:
        seg.to_leg_id = payload.to_leg_id
    if payload.title is not None:
        seg.title = payload.title
    if payload.badge is not None:
        seg.badge = payload.badge
    if payload.start_date is not None:
        seg.start_date = payload.start_date
    if payload.end_date is not None:
        seg.end_date = payload.end_date
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.delete("/{trip_id}/travel/{segment_id}")
def delete_travel_segment(trip_id: int, segment_id: int, db: Session = Depends(get_db)):
    trip = db.get(models.Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    seg = db.get(models.TravelSegment, segment_id)
    if not seg or seg.trip_id != trip_id:
        raise HTTPException(status_code=404, detail="Travel segment not found")
    db.delete(seg)
    db.commit()
    return {"message": "Travel segment deleted successfully"}

