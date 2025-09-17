from sqlalchemy import Integer, String, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column

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


