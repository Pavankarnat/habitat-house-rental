from datetime import datetime, date
from sqlalchemy import String, Integer, Float, Boolean, Date, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Locality(Base):
    __tablename__ = "localities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    city: Mapped[str] = mapped_column(String(120), default="Hyderabad", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    connectivity_score: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    properties = relationship("PropertyRecord", back_populates="locality", cascade="all, delete-orphan")
    readings = relationship("PollutionReading", back_populates="locality", cascade="all, delete-orphan")
    amenities = relationship("Amenity", back_populates="locality", cascade="all, delete-orphan")

class PropertyRecord(Base):
    __tablename__ = "property_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    locality_id: Mapped[int] = mapped_column(ForeignKey("localities.id", ondelete="CASCADE"), index=True)
    property_type: Mapped[str] = mapped_column(String(40), default="Apartment")
    bhk: Mapped[int] = mapped_column(Integer, default=2)
    area_sqft: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=True)
    locality = relationship("Locality", back_populates="properties")

class PollutionReading(Base):
    __tablename__ = "pollution_readings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    locality_id: Mapped[int] = mapped_column(ForeignKey("localities.id", ondelete="CASCADE"), index=True)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False)
    pm25: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm10: Mapped[float | None] = mapped_column(Float, nullable=True)
    aqi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str] = mapped_column(String(40), default="Unavailable")
    is_sample: Mapped[bool] = mapped_column(Boolean, default=True)
    locality = relationship("Locality", back_populates="readings")

class Amenity(Base):
    __tablename__ = "amenities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    locality_id: Mapped[int] = mapped_column(ForeignKey("localities.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    locality = relationship("Locality", back_populates="amenities")

class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "locality_id", name="uq_favorite_user_locality"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    locality_id: Mapped[int] = mapped_column(ForeignKey("localities.id", ondelete="CASCADE"), index=True)

class SavedComparison(Base):
    __tablename__ = "saved_comparisons"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    locality_ids: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AlertRule(Base):
    __tablename__ = "alert_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    locality_id: Mapped[int] = mapped_column(ForeignKey("localities.id", ondelete="CASCADE"), index=True)
    max_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_rent: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_aqi: Mapped[int | None] = mapped_column(Integer, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    record_type: Mapped[str] = mapped_column(String(80), nullable=False)
    record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
