from pydantic import BaseModel, Field
from typing import Optional


class BacklogCardBase(BaseModel):
  category: str = "activities"
  title: str
  location: str = ""
  cost: Optional[float] = None
  rating: Optional[float] = None
  desire_to_go: Optional[float] = None
  requires_reservation: bool = False
  description: str = ""
  reserved: bool = False
  reservation_date: Optional[str] = None
  locked_in: bool = False


class BacklogCardCreate(BacklogCardBase):
  pass


class BacklogCardRead(BacklogCardBase):
  id: int

  class Config:
    from_attributes = True


