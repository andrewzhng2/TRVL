from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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


class BacklogCardUpdate(BaseModel):
  category: Optional[str] = None
  title: Optional[str] = None
  location: Optional[str] = None
  cost: Optional[float] = None
  rating: Optional[float] = None
  desire_to_go: Optional[float] = None
  requires_reservation: Optional[bool] = None
  description: Optional[str] = None
  reserved: Optional[bool] = None
  reservation_date: Optional[str] = None
  locked_in: Optional[bool] = None


class BacklogCardRead(BacklogCardBase):
  id: int
  created_by: Optional[int] = None
  created_at: Optional[datetime] = None
  creator: Optional["UserRead"] = None

  class Config:
    from_attributes = True


class UserRead(BaseModel):
  id: int
  email: str
  name: str
  picture: str

  class Config:
    from_attributes = True


class GoogleLoginPayload(BaseModel):
  id_token: str = Field(..., description="Google ID token from GIS")


class SessionRead(BaseModel):
  token: str
  user: UserRead


class TripBase(BaseModel):
  name: str
  start_date: Optional[str] = None
  end_date: Optional[str] = None


class TripCreate(TripBase):
  pass


class TripRead(TripBase):
  id: int
  legs: list["TripLegRead"] = []

  class Config:
    from_attributes = True


class TripUpdate(BaseModel):
  name: Optional[str] = None
  start_date: Optional[str | None] = None
  end_date: Optional[str | None] = None


class TripLegBase(BaseModel):
  name: str
  start_date: Optional[str] = None
  end_date: Optional[str] = None
  order_index: int = 0


class TripLegCreate(TripLegBase):
  pass


class TripLegRead(TripLegBase):
  id: int

  class Config:
    from_attributes = True


class TripLegUpdate(BaseModel):
  name: Optional[str] = None
  start_date: Optional[str | None] = None
  end_date: Optional[str | None] = None
  order_index: Optional[int] = None


class ScheduledEventBase(BaseModel):
  trip_id: int
  card_id: int
  day_index: int
  hour: int


class ScheduledEventCreate(ScheduledEventBase):
  pass


class ScheduledEventRead(ScheduledEventBase):
  id: int
  created_by: Optional[int] = None
  created_at: Optional[datetime] = None

  class Config:
    from_attributes = True

