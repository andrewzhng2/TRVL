from sqlalchemy import Integer, String, Boolean, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from .db import Base


class BacklogCard(Base):
    __tablename__ = "backlog_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="activities")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    distance_from_hotel_km: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    desire_to_go: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    requires_reservation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str] = mapped_column(String(2000), default="", nullable=False)
    reserved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reservation_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    locked_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    picture: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    sections: Mapped[list["TripSection"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    legs: Mapped[list["TripLeg"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    travel_segments: Mapped[list["TravelSegment"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    creator: Mapped["User | None"] = relationship("User")


class TripSection(Base):
    __tablename__ = "trip_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # backlog | schedule | travel | packing
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    trip: Mapped[Trip] = relationship(back_populates="sections")


class TripLeg(Base):
    __tablename__ = "trip_legs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    trip: Mapped[Trip] = relationship(back_populates="legs")


class ScheduledEvent(Base):
    __tablename__ = "scheduled_events"
    __table_args__ = (
        UniqueConstraint("trip_id", "day_index", "hour", name="uq_schedule_slot"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    card_id: Mapped[int] = mapped_column(ForeignKey("backlog_cards.id", ondelete="CASCADE"), nullable=False)
    day_index: Mapped[int] = mapped_column(Integer, nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    trip: Mapped[Trip] = relationship("Trip")
    card: Mapped[BacklogCard] = relationship("BacklogCard")


class TravelSegment(Base):
    __tablename__ = "travel_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    # edge_type indicates where this segment lives relative to legs: departure | between | return
    edge_type: Mapped[str] = mapped_column(String(20), nullable=False)
    from_leg_id: Mapped[int | None] = mapped_column(ForeignKey("trip_legs.id", ondelete="CASCADE"), nullable=True)
    to_leg_id: Mapped[int | None] = mapped_column(ForeignKey("trip_legs.id", ondelete="CASCADE"), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transport_type: Mapped[str] = mapped_column(String(20), nullable=False, default="plane")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    badge: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    start_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    trip: Mapped[Trip] = relationship(back_populates="travel_segments")
