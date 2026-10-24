import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_dashboard_metrics():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["locality_count"] >= 6
    assert data["property_count"] > 0
    assert "median_price" in data
    assert "median_rent" in data
    assert "median_aqi" in data

def test_localities_endpoint():
    response = client.get("/api/localities")
    assert response.status_code == 200
    localities = response.json()
    assert len(localities) >= 6
    assert any(l["name"] == "Kukatpally" for l in localities)

def test_housing_filter_bhk():
    response = client.get("/api/housing?bhk=2")
    assert response.status_code == 200
    items = response.json()
    assert all(item["bhk"] == 2 for item in items)

def test_emi_api_calculation():
    payload = {"principal": 4000000, "annual_interest_rate": 8.5, "tenure_years": 20}
    response = client.post("/api/calculators/emi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_emi"] > 30000
    assert data["total_payment"] > 4000000

def test_emi_zero_interest_api():
    payload = {"principal": 120000, "annual_interest_rate": 0, "tenure_years": 1}
    response = client.post("/api/calculators/emi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["monthly_emi"] == 10000
    assert data["total_interest"] == 0

def test_ownership_cost_api():
    payload = {
        "property_price": 8500000,
        "down_payment_percent": 20,
        "annual_interest_rate": 8.5,
        "tenure_years": 20,
        "stamp_duty_percent": 6.0,
        "registration_percent": 1.5,
        "monthly_maintenance": 3500,
        "holding_years": 5
    }
    response = client.post("/api/calculators/ownership-cost", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["down_payment"] == 1700000
    assert data["stamp_duty"] == 510000
    assert data["total_outlay"] > data["total_upfront"]

def test_locality_comparison_api():
    locs = client.get("/api/localities").json()
    ids = [locs[0]["id"], locs[1]["id"]]
    response = client.post("/api/comparisons", json={"locality_ids": ids})
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2

def test_recommendation_api():
    payload = {
        "budget": 6000000,
        "weight_affordability": 0.40,
        "weight_environment": 0.30,
        "weight_amenities": 0.20,
        "weight_connectivity": 0.10
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) > 0
    assert "score" in recs[0]
    assert "factors" in recs[0]

def test_chatbot_query_api():
    payload = {"message": "What is the price in Kukatpally?"}
    response = client.post("/api/chatbot/message", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Kukatpally" in data["reply"]

def test_auth_login_seeded_admin():
    payload = {"email": "admin@housing.local", "password": "ChangeMe123!"}
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "admin"
    assert "access_token" in data
