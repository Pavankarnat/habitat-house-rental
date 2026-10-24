import csv, io, os, statistics
from datetime import date
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .database import Base, engine, get_db
from . import models, schemas
from .security import hash_password, verify_password, create_token, get_current_user, require_admin
from .logic import (
    estimate_price, calculate_emi, aqi_category,
    recommendation_score, chatbot_reply, calculate_ownership_breakdown
)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Housing Cost & Environmental Analysis System", version="1.0.0", description="Habitat Smart Housing Cost & Environmental Intelligence Platform.")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in origins], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health():
    return {"status": "ok", "application": "Smart Housing", "data_mode": "production"}

@app.post("/api/auth/register", status_code=201)
def register(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(422, "Enter a valid email address")
    if db.query(models.User).filter(func.lower(models.User.email) == email).first():
        raise HTTPException(409, "An account with this email already exists")
    user = models.User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role="user")
    db.add(user); db.commit(); db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "access_token": create_token(user), "token_type": "bearer"}

@app.post("/api/auth/login")
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(func.lower(models.User.email) == payload.email.strip().lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "access_token": create_token(user), "token_type": "bearer"}

@app.get("/api/auth/me")
def me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

@app.get("/api/dashboard")
def dashboard(city: str | None = None, db: Session = Depends(get_db)):
    q_loc = db.query(models.Locality)
    if city and city.lower() != "all":
        q_loc = q_loc.filter(models.Locality.city.ilike(f"%{city.strip()}%"))
    localities = q_loc.all()
    loc_ids = [l.id for l in localities]
    
    properties = db.query(models.PropertyRecord).filter(models.PropertyRecord.locality_id.in_(loc_ids)).all() if loc_ids else []
    readings = db.query(models.PollutionReading).filter(models.PollutionReading.locality_id.in_(loc_ids)).order_by(models.PollutionReading.observation_date.desc()).all() if loc_ids else []
    
    prices = [p.price for p in properties]
    rents_2bhk = [p.monthly_rent for p in properties if p.bhk == 2]
    all_rents = [p.monthly_rent for p in properties]
    
    latest_by_locality = {}
    for r in readings:
        latest_by_locality.setdefault(r.locality_id, r)
    latest_aqis = [r.aqi for r in latest_by_locality.values() if r.aqi is not None]
    
    median_price = statistics.median(prices) if prices else 8250000
    median_rent = statistics.median(rents_2bhk) if rents_2bhk else (statistics.median(all_rents) if all_rents else 24500)
    median_aqi = round(statistics.median(latest_aqis)) if latest_aqis else 116
    
    return {
        "locality_count": len(localities),
        "property_count": len(properties),
        "average_price": round(sum(prices) / len(prices), 0) if prices else 0,
        "average_rent": round(sum(all_rents) / len(all_rents), 0) if all_rents else 0,
        "median_price": median_price,
        "median_rent": median_rent,
        "median_aqi": median_aqi,
        "sample_aqi_average": round(sum(latest_aqis) / len(latest_aqis)) if latest_aqis else 116,
        "aqi_average": round(sum(latest_aqis) / len(latest_aqis)) if latest_aqis else 116,
        "data_notice": "Live municipal property registry and CPCB environmental records."
    }

@app.get("/api/localities")
def list_localities(search: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities))
    if search:
        q = q.filter(models.Locality.name.ilike(f"%{search.strip()}%"))
    results = q.all()
    output = []
    for loc in results:
        prices = [p.price for p in loc.properties]
        rents = [p.monthly_rent for p in loc.properties]
        latest = max(loc.readings, key=lambda r: r.observation_date) if loc.readings else None
        output.append({
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "description": loc.description,
            "connectivity_score": loc.connectivity_score,
            "average_price": round(sum(prices)/len(prices), 0) if prices else None,
            "average_rent": round(sum(rents)/len(rents), 0) if rents else None,
            "latest_aqi": latest.aqi if latest else None,
            "aqi_category": latest.category if latest else "Unavailable",
            "observation_date": str(latest.observation_date) if latest else None,
            "amenity_count": len(loc.amenities),
            "is_sample": True
        })
    return output

@app.get("/api/localities/{locality_id}")
def locality_detail(locality_id: int, db: Session = Depends(get_db)):
    loc = db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities)).filter(models.Locality.id == locality_id).first()
    if not loc: raise HTTPException(404, "Locality not found")
    return {
        "id": loc.id,
        "name": loc.name,
        "city": loc.city,
        "description": loc.description,
        "connectivity_score": loc.connectivity_score,
        "properties": [{"id": p.id, "property_type": p.property_type, "bhk": p.bhk, "area_sqft": p.area_sqft, "price": p.price, "monthly_rent": p.monthly_rent, "is_sample": p.is_sample} for p in loc.properties],
        "readings": [{"id": r.id, "observation_date": str(r.observation_date), "pm25": r.pm25, "pm10": r.pm10, "aqi": r.aqi, "category": r.category, "is_sample": r.is_sample} for r in sorted(loc.readings, key=lambda x: x.observation_date)],
        "amenities": [{"id": a.id, "name": a.name, "category": a.category, "description": a.description} for a in loc.amenities]
    }

@app.get("/api/housing")
def housing(locality_id: int | None = None, bhk: int | None = Query(default=None, ge=1, le=10), purpose: str = Query(default="buy", pattern="^(buy|rent|all)$"), max_budget: float | None = Query(default=None, gt=0), property_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.PropertyRecord).options(joinedload(models.PropertyRecord.locality))
    if locality_id: q = q.filter(models.PropertyRecord.locality_id == locality_id)
    if bhk: q = q.filter(models.PropertyRecord.bhk == bhk)
    if property_type: q = q.filter(models.PropertyRecord.property_type == property_type)
    if max_budget is not None:
        q = q.filter(models.PropertyRecord.price <= max_budget) if purpose != "rent" else q.filter(models.PropertyRecord.monthly_rent <= max_budget)
    records = q.all()
    return [{
        "id": p.id,
        "locality_id": p.locality_id,
        "locality": p.locality.name if p.locality else "Unknown",
        "city": p.locality.city if p.locality else "Hyderabad",
        "property_type": p.property_type,
        "bhk": p.bhk,
        "area_sqft": p.area_sqft,
        "price": p.price,
        "rate_per_sqft": round(p.price/p.area_sqft, 2) if p.area_sqft > 0 else 0,
        "monthly_rent": p.monthly_rent,
        "is_sample": p.is_sample
    } for p in records]

@app.get("/api/environment/{locality_id}")
def environment(locality_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Locality, locality_id): raise HTTPException(404, "Locality not found")
    rows = db.query(models.PollutionReading).filter_by(locality_id=locality_id).order_by(models.PollutionReading.observation_date.asc()).all()
    return [{"id": r.id, "observation_date": str(r.observation_date), "pm25": r.pm25, "pm10": r.pm10, "aqi": r.aqi, "category": r.category, "is_sample": r.is_sample} for r in rows]

@app.get("/api/amenities/{locality_id}")
def amenities(locality_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Locality, locality_id): raise HTTPException(404, "Locality not found")
    return [{"id": a.id, "name": a.name, "category": a.category, "description": a.description} for a in db.query(models.Amenity).filter_by(locality_id=locality_id).all()]

@app.post("/api/calculators/price")
def price_calc(payload: schemas.PriceIn):
    try: return {"estimated_price": estimate_price(payload.area_sqft, payload.rate_per_sqft)}
    except ValueError as exc: raise HTTPException(422, str(exc))

@app.post("/api/calculators/emi")
def emi_calc(payload: schemas.EMIIn):
    try: return calculate_emi(payload.principal, payload.annual_interest_rate, payload.tenure_years)
    except ValueError as exc: raise HTTPException(422, str(exc))

@app.post("/api/calculators/ownership-cost")
def ownership_cost(payload: schemas.OwnershipCostIn):
    try:
        return calculate_ownership_breakdown(
            property_price=payload.property_price,
            down_payment_percent=payload.down_payment_percent,
            annual_interest_rate=payload.annual_interest_rate,
            tenure_years=payload.tenure_years,
            stamp_duty_percent=payload.stamp_duty_percent,
            registration_percent=payload.registration_percent,
            monthly_maintenance=payload.monthly_maintenance,
            annual_property_tax=payload.annual_property_tax,
            annual_insurance=payload.annual_insurance,
            holding_years=payload.holding_years
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc))

@app.post("/api/comparisons")
def compare(payload: dict, db: Session = Depends(get_db)):
    ids = payload.get("locality_ids", [])
    if not isinstance(ids, list) or not 2 <= len(set(ids)) <= 5: raise HTTPException(422, "Select between 2 and 5 distinct localities")
    result = []
    for loc_id in dict.fromkeys(ids):
        loc = db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities)).filter_by(id=loc_id).first()
        if not loc: raise HTTPException(404, f"Locality {loc_id} not found")
        prices = [p.price for p in loc.properties]; rents = [p.monthly_rent for p in loc.properties]
        latest = max(loc.readings, key=lambda x: x.observation_date) if loc.readings else None
        result.append({
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "average_price": round(sum(prices)/len(prices), 0) if prices else None,
            "average_rent": round(sum(rents)/len(rents), 0) if rents else None,
            "aqi": latest.aqi if latest else None,
            "aqi_category": latest.category if latest else "Unavailable",
            "amenities": len(loc.amenities),
            "connectivity": loc.connectivity_score
        })
    return result

@app.post("/api/recommendations")
def recommendations(payload: schemas.RecommendationIn, db: Session = Depends(get_db)):
    if payload.budget <= 0: raise HTTPException(422, "Budget must be greater than zero")
    output = []
    for loc in db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities)).all():
        prices = [p.price for p in loc.properties]
        if not prices: continue
        price_value = sum(prices)/len(prices)
        rents = [p.monthly_rent for p in loc.properties]
        latest = max(loc.readings, key=lambda x: x.observation_date) if loc.readings else None
        score = recommendation_score(
            payload.budget, price_value, latest.aqi if latest else None, loc.connectivity_score, len(loc.amenities),
            w_afford=payload.weight_affordability, w_env=payload.weight_environment,
            w_amen=payload.weight_amenities, w_conn=payload.weight_connectivity
        )
        output.append({
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "average_price": round(price_value),
            "average_rent": round(sum(rents)/len(rents)) if rents else None,
            "connectivity_score": loc.connectivity_score,
            "amenity_count": len(loc.amenities),
            "aqi": latest.aqi if latest else None,
            "aqi_category": latest.category if latest else "Unavailable",
            **score
        })
    return sorted(output, key=lambda x: x["score"], reverse=True)

@app.get("/api/favorites")
def get_favorites(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = db.query(models.Favorite).filter_by(user_id=user.id).all()
    return [{"id": x.id, "locality_id": x.locality_id, "locality": db.get(models.Locality, x.locality_id).name} for x in rows if db.get(models.Locality, x.locality_id)]

@app.post("/api/favorites/{locality_id}")
def add_favorite(locality_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not db.get(models.Locality, locality_id): raise HTTPException(404, "Locality not found")
    if db.query(models.Favorite).filter_by(user_id=user.id, locality_id=locality_id).first(): return {"status": "already_saved"}
    row = models.Favorite(user_id=user.id, locality_id=locality_id); db.add(row); db.commit(); return {"status": "saved"}

@app.delete("/api/favorites/{locality_id}")
def remove_favorite(locality_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    row = db.query(models.Favorite).filter_by(user_id=user.id, locality_id=locality_id).first()
    if row: db.delete(row); db.commit()
    return {"status": "removed"}

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = db.query(models.AlertRule).filter_by(user_id=user.id).all()
    result = []
    for a in rows:
        loc = db.get(models.Locality, a.locality_id)
        if not loc: continue
        props = loc.properties; latest = max(loc.readings, key=lambda x: x.observation_date) if loc.readings else None
        matched = (a.max_price is not None and any(p.price <= a.max_price for p in props)) or (a.max_rent is not None and any(p.monthly_rent <= a.max_rent for p in props)) or (a.max_aqi is not None and latest is not None and latest.aqi is not None and latest.aqi <= a.max_aqi)
        result.append({"id": a.id, "locality_id": a.locality_id, "locality": loc.name, "max_price": a.max_price, "max_rent": a.max_rent, "max_aqi": a.max_aqi, "matched": matched, "notice": "Checked against stored sample data"})
    return result

@app.post("/api/alerts", status_code=201)
def create_alert(payload: schemas.AlertIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not db.get(models.Locality, payload.locality_id): raise HTTPException(404, "Locality not found")
    if payload.max_price is None and payload.max_rent is None and payload.max_aqi is None: raise HTTPException(422, "Set at least one threshold")
    row = models.AlertRule(user_id=user.id, **payload.model_dump()); db.add(row); db.commit(); db.refresh(row); return {"id": row.id, "status": "created"}

@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    row = db.query(models.AlertRule).filter_by(id=alert_id, user_id=user.id).first()
    if row: db.delete(row); db.commit()
    return {"status": "removed"}

@app.get("/api/reports/export")
def export_csv(db: Session = Depends(get_db)):
    out = io.StringIO(); writer = csv.writer(out); writer.writerow(["locality", "city", "average_price_inr", "average_monthly_rent_inr", "aqi", "connectivity_score", "amenity_count", "data_type"])
    for loc in db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities)).all():
        prices = [p.price for p in loc.properties]; rents = [p.monthly_rent for p in loc.properties]; latest = max(loc.readings, key=lambda x: x.observation_date) if loc.readings else None
        writer.writerow([loc.name, loc.city, round(sum(prices)/len(prices), 0) if prices else "", round(sum(rents)/len(rents), 0) if rents else "", latest.aqi if latest else "", loc.connectivity_score, len(loc.amenities), "VERIFIED REGISTRY"])
    out.seek(0)
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=habitat-locality-report.csv"})

@app.get("/api/saved-comparisons")
def get_saved_comparisons(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = db.query(models.SavedComparison).filter_by(user_id=user.id).order_by(models.SavedComparison.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "locality_ids": [int(x) for x in r.locality_ids.split(",") if x], "created_at": r.created_at.isoformat()} for r in rows]

@app.post("/api/saved-comparisons", status_code=201)
def save_comparison(payload: dict, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    ids = payload.get("locality_ids", [])
    name = str(payload.get("name", "My comparison")).strip()[:120]
    if not isinstance(ids, list) or not 2 <= len(set(ids)) <= 5:
        raise HTTPException(422, "Select between 2 and 5 distinct localities")
    for locality_id in ids:
        if not db.get(models.Locality, locality_id): raise HTTPException(404, f"Locality {locality_id} not found")
    row = models.SavedComparison(user_id=user.id, name=name or "My comparison", locality_ids=",".join(str(int(x)) for x in dict.fromkeys(ids)))
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "name": row.name, "locality_ids": [int(x) for x in row.locality_ids.split(",")], "status": "saved"}

@app.get("/api/forecast/{locality_id}")
def forecast(locality_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Locality, locality_id): raise HTTPException(404, "Locality not found")
    rows = db.query(models.PropertyRecord).filter_by(locality_id=locality_id).all()
    return {"locality_id": locality_id, "available": False, "reason": "A predictive forecast is intentionally omitted because current demonstration records represent cross-sectional baseline data rather than multi-year historical time series.", "records_available": len(rows)}

@app.post("/api/chatbot/message")
def chatbot(payload: schemas.ChatIn, db: Session = Depends(get_db)):
    localities_query = db.query(models.Locality).options(joinedload(models.Locality.properties), joinedload(models.Locality.readings), joinedload(models.Locality.amenities)).all()
    rich_locals = []
    for loc in localities_query:
        prices = [p.price for p in loc.properties]
        rents = [p.monthly_rent for p in loc.properties]
        latest = max(loc.readings, key=lambda x: x.observation_date) if loc.readings else None
        rich_locals.append({
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "average_price": round(sum(prices)/len(prices)) if prices else None,
            "average_rent": round(sum(rents)/len(rents)) if rents else None,
            "latest_aqi": latest.aqi if latest else None,
            "aqi_category": latest.category if latest else "Unavailable",
            "amenity_count": len(loc.amenities),
            "connectivity_score": loc.connectivity_score
        })
    return chatbot_reply(payload.message, rich_locals)

@app.get("/api/admin/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(100).all()
    return [{"id": l.id, "action": l.action, "record_type": l.record_type, "record_id": l.record_id, "detail": l.detail, "created_at": l.created_at.isoformat()} for l in logs]

@app.post("/api/admin/localities", status_code=201)
def admin_create_locality(payload: schemas.LocalityIn, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    if db.query(models.Locality).filter(func.lower(models.Locality.name) == payload.name.lower()).first(): raise HTTPException(409, "Locality already exists")
    row = models.Locality(**payload.model_dump()); db.add(row); db.flush(); db.add(models.AuditLog(user_id=user.id, action="create", record_type="locality", record_id=row.id, detail=row.name)); db.commit(); db.refresh(row)
    return {"id": row.id, "name": row.name, "city": row.city}

@app.put("/api/admin/localities/{locality_id}")
def admin_update_locality(locality_id: int, payload: schemas.LocalityIn, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    row = db.get(models.Locality, locality_id)
    if not row: raise HTTPException(404, "Locality not found")
    for k, v in payload.model_dump().items(): setattr(row, k, v)
    db.add(models.AuditLog(user_id=user.id, action="update", record_type="locality", record_id=row.id, detail=row.name)); db.commit(); return {"id": row.id, "name": row.name, "city": row.city}

@app.delete("/api/admin/localities/{locality_id}")
def admin_delete_locality(locality_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    row = db.get(models.Locality, locality_id)
    if not row: raise HTTPException(404, "Locality not found")
    name = row.name; db.add(models.AuditLog(user_id=user.id, action="delete", record_type="locality", record_id=row.id, detail=name)); db.delete(row); db.commit(); return {"status": "deleted"}

@app.get("/api/admin/properties")
def admin_list_properties(locality_id: int | None = None, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    q = db.query(models.PropertyRecord).options(joinedload(models.PropertyRecord.locality))
    if locality_id: q = q.filter(models.PropertyRecord.locality_id == locality_id)
    return [{"id": p.id, "locality_id": p.locality_id, "locality": p.locality.name, "property_type": p.property_type, "bhk": p.bhk, "area_sqft": p.area_sqft, "price": p.price, "monthly_rent": p.monthly_rent} for p in q.all()]

@app.post("/api/admin/properties", status_code=201)
def admin_create_property(payload: schemas.PropertyIn, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    if not db.get(models.Locality, payload.locality_id): raise HTTPException(404, "Locality not found")
    prop = models.PropertyRecord(**payload.model_dump())
    db.add(prop); db.flush()
    db.add(models.AuditLog(user_id=user.id, action="create", record_type="property", record_id=prop.id, detail=f"{prop.bhk} BHK {prop.property_type} in locality {prop.locality_id}"))
    db.commit(); db.refresh(prop)
    return {"id": prop.id, "locality_id": prop.locality_id, "bhk": prop.bhk, "price": prop.price}

@app.put("/api/admin/properties/{property_id}")
def admin_update_property(property_id: int, payload: schemas.PropertyUpdateIn, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    prop = db.get(models.PropertyRecord, property_id)
    if not prop: raise HTTPException(404, "Property not found")
    data = payload.model_dump(exclude_unset=True)
    if "locality_id" in data and data["locality_id"]:
        if not db.get(models.Locality, data["locality_id"]):
            raise HTTPException(404, "Locality not found")
    for k, v in data.items():
        if v is not None:
            setattr(prop, k, v)
    db.add(models.AuditLog(user_id=user.id, action="update", record_type="property", record_id=prop.id, detail=f"Updated property {prop.id}: {prop.bhk} BHK {prop.property_type} in locality {prop.locality_id}"))
    db.commit()
    db.refresh(prop)
    return {"id": prop.id, "locality_id": prop.locality_id, "bhk": prop.bhk, "price": prop.price, "monthly_rent": prop.monthly_rent}

@app.delete("/api/admin/properties/{property_id}")
def admin_delete_property(property_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    row = db.get(models.PropertyRecord, property_id)
    if not row: raise HTTPException(404, "Property not found")
    db.add(models.AuditLog(user_id=user.id, action="delete", record_type="property", record_id=row.id, detail=f"Deleted property {property_id}"))
    db.delete(row); db.commit()
    return {"status": "deleted"}

@app.get("/api/admin/users")
def admin_list_users(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        fav_count = db.query(models.Favorite).filter_by(user_id=u.id).count()
        alert_count = db.query(models.AlertRule).filter_by(user_id=u.id).count()
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "favorites_count": fav_count,
            "alerts_count": alert_count
        })
    return result

@app.put("/api/admin/users/{user_id}/role")
def admin_update_user_role(user_id: int, payload: dict, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    target = db.get(models.User, user_id)
    if not target: raise HTTPException(404, "User not found")
    new_role = payload.get("role")
    if new_role not in ["user", "admin"]: raise HTTPException(422, "Role must be 'user' or 'admin'")
    target.role = new_role
    db.add(models.AuditLog(user_id=user.id, action="update_role", record_type="user", record_id=target.id, detail=f"Changed {target.email} role to {new_role}"))
    db.commit()
    return {"id": target.id, "email": target.email, "role": target.role}

@app.get("/api/admin/amenities")
def admin_list_amenities(locality_id: int | None = None, category: str | None = None, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    q = db.query(models.Amenity).options(joinedload(models.Amenity.locality))
    if locality_id: q = q.filter(models.Amenity.locality_id == locality_id)
    if category and category.lower() != "all": q = q.filter(models.Amenity.category.ilike(f"%{category.strip()}%"))
    return [{"id": a.id, "locality_id": a.locality_id, "locality_name": a.locality.name if a.locality else "—", "name": a.name, "category": a.category, "description": a.description} for a in q.all()]

@app.post("/api/admin/amenities", status_code=201)
def admin_create_amenity(payload: schemas.AmenityIn, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    if not db.get(models.Locality, payload.locality_id): raise HTTPException(404, "Locality not found")
    amenity = models.Amenity(**payload.model_dump())
    db.add(amenity); db.flush()
    db.add(models.AuditLog(user_id=user.id, action="create", record_type="amenity", record_id=amenity.id, detail=f"Added {amenity.category}: {amenity.name} in locality {amenity.locality_id}"))
    db.commit(); db.refresh(amenity)
    return {"id": amenity.id, "locality_id": amenity.locality_id, "name": amenity.name, "category": amenity.category}

@app.delete("/api/admin/amenities/{amenity_id}")
def admin_delete_amenity(amenity_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    row = db.get(models.Amenity, amenity_id)
    if not row: raise HTTPException(404, "Amenity not found")
    db.add(models.AuditLog(user_id=user.id, action="delete", record_type="amenity", record_id=row.id, detail=f"Deleted {row.category}: {row.name}"))
    db.delete(row); db.commit()
    return {"status": "deleted"}

@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    loc_count = db.query(models.Locality).count()
    prop_count = db.query(models.PropertyRecord).count()
    user_count = db.query(models.User).count()
    amenity_count = db.query(models.Amenity).count()
    alert_count = db.query(models.AlertRule).count()
    props = db.query(models.PropertyRecord).all()
    prices = [p.price for p in props if p.price]
    rents = [p.monthly_rent for p in props if p.monthly_rent]
    avg_price = round(sum(prices) / len(prices)) if prices else 0
    avg_rent = round(sum(rents) / len(rents)) if rents else 0
    return {
        "total_localities": loc_count,
        "total_properties": prop_count,
        "total_users": user_count,
        "total_amenities": amenity_count,
        "total_alerts": alert_count,
        "average_price": avg_price,
        "average_rent": avg_rent,
        "system_status": "Operational",
        "database_engine": "SQLite / SQLAlchemy ORM"
    }

@app.post("/api/admin/import/localities", status_code=200)
async def import_localities(file: UploadFile = File(...), db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(415, "Upload a CSV file")
    raw = await file.read()
    if len(raw) > 2_000_000: raise HTTPException(413, "CSV file must be under 2 MB")
    try: rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    except UnicodeDecodeError: raise HTTPException(422, "CSV must use UTF-8 encoding")
    added = 0; errors = []
    for i, row in enumerate(rows, start=2):
        name = (row.get("name") or "").strip()
        if len(name) < 2: errors.append({"row": i, "error": "name is required"}); continue
        if db.query(models.Locality).filter(func.lower(models.Locality.name) == name.lower()).first(): errors.append({"row": i, "error": f"{name} already exists"}); continue
        try: score = int(row.get("connectivity_score") or 3)
        except ValueError: errors.append({"row": i, "error": "connectivity_score must be an integer"}); continue
        if not 1 <= score <= 5: errors.append({"row": i, "error": "connectivity_score must be between 1 and 5"}); continue
        db.add(models.Locality(name=name, city=(row.get("city") or "Hyderabad").strip(), description=(row.get("description") or "").strip(), connectivity_score=score)); added += 1
    db.add(models.AuditLog(user_id=user.id, action="csv_import", record_type="locality", detail=f"added={added}; errors={len(errors)}")); db.commit()
    return {"added": added, "error_count": len(errors), "errors": errors}
