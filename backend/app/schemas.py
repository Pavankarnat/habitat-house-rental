from pydantic import BaseModel, Field
from typing import Optional

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: str
    password: str

class LocalityIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    city: str = "Hyderabad"
    description: str = ""
    connectivity_score: int = Field(default=3, ge=1, le=5)

class PropertyIn(BaseModel):
    locality_id: int
    property_type: str = "Apartment"
    bhk: int = Field(ge=1, le=10)
    area_sqft: float = Field(gt=0, le=100000)
    price: float = Field(gt=0)
    monthly_rent: float = Field(ge=0)
    is_sample: bool = True

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

class EMIIn(BaseModel):
    principal: float = Field(gt=0)
    annual_interest_rate: float = Field(ge=0, le=50)
    tenure_years: int = Field(ge=1, le=40)

class PriceIn(BaseModel):
    area_sqft: float = Field(gt=0, le=100000)
    rate_per_sqft: float = Field(gt=0)

class OwnershipCostIn(BaseModel):
    property_price: float = Field(gt=0)
    down_payment_percent: float = Field(default=20.0, ge=5.0, le=90.0)
    annual_interest_rate: float = Field(default=8.5, ge=0.0, le=50.0)
    tenure_years: int = Field(default=20, ge=1, le=40)
    stamp_duty_percent: float = Field(default=6.0, ge=0.0, le=15.0)
    registration_percent: float = Field(default=1.5, ge=0.0, le=10.0)
    monthly_maintenance: float = Field(default=3500.0, ge=0.0)
    annual_property_tax: float = Field(default=12000.0, ge=0.0)
    annual_insurance: float = Field(default=8000.0, ge=0.0)
    holding_years: int = Field(default=5, ge=1, le=30)

class RecommendationIn(BaseModel):
    budget: float = Field(default=7500000, gt=0)
    weight_affordability: float = Field(default=0.40, ge=0.0, le=1.0)
    weight_environment: float = Field(default=0.30, ge=0.0, le=1.0)
    weight_amenities: float = Field(default=0.20, ge=0.0, le=1.0)
    weight_connectivity: float = Field(default=0.10, ge=0.0, le=1.0)

class AlertIn(BaseModel):
    locality_id: int
    max_price: Optional[float] = Field(default=None, gt=0)
    max_rent: Optional[float] = Field(default=None, gt=0)
    max_aqi: Optional[int] = Field(default=None, ge=0, le=500)

class PropertyUpdateIn(BaseModel):
    locality_id: Optional[int] = None
    property_type: Optional[str] = None
    bhk: Optional[int] = Field(default=None, ge=1, le=10)
    area_sqft: Optional[float] = Field(default=None, gt=0, le=100000)
    price: Optional[float] = Field(default=None, gt=0)
    monthly_rent: Optional[float] = Field(default=None, ge=0)

class AmenityIn(BaseModel):
    locality_id: int
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(default="Infrastructure", min_length=2, max_length=50)
    description: str = Field(default="")

class AmenityUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    category: Optional[str] = Field(default=None, min_length=2, max_length=50)
    description: Optional[str] = Field(default=None)
