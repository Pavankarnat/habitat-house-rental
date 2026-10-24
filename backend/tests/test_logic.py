import pytest
from app.logic import (
    estimate_price, calculate_emi, aqi_category,
    recommendation_score, chatbot_reply, calculate_ownership_breakdown
)

def test_price_estimate():
    assert estimate_price(1000, 5000) == 5_000_000
    assert estimate_price(1500.5, 6000) == 9_003_000.0

def test_price_rejects_invalid_values():
    with pytest.raises(ValueError): estimate_price(0, 5000)
    with pytest.raises(ValueError): estimate_price(100, -1)
    with pytest.raises(ValueError): estimate_price(-50, 4000)

def test_emi_zero_interest():
    result = calculate_emi(120000, 0, 1)
    assert result["monthly_emi"] == 10000
    assert result["total_interest"] == 0
    assert result["total_payment"] == 120000

def test_emi_regular_interest():
    result = calculate_emi(1_000_000, 8.5, 20)
    assert 8500 < result["monthly_emi"] < 9000
    assert result["total_payment"] > 1_000_000
    assert result["total_interest"] > 0

def test_emi_rejects_invalid_inputs():
    with pytest.raises(ValueError): calculate_emi(-1000, 8.5, 20)
    with pytest.raises(ValueError): calculate_emi(100000, -2, 20)
    with pytest.raises(ValueError): calculate_emi(100000, 8.5, 0)

def test_ownership_cost_calculation():
    breakdown = calculate_ownership_breakdown(
        property_price=10_000_000,
        down_payment_percent=20.0,
        annual_interest_rate=8.5,
        tenure_years=20,
        stamp_duty_percent=6.0,
        registration_percent=1.5,
        holding_years=5
    )
    assert breakdown["down_payment"] == 2_000_000
    assert breakdown["loan_principal"] == 8_000_000
    assert breakdown["stamp_duty"] == 600_000
    assert breakdown["registration"] == 150_000
    assert breakdown["total_upfront"] == 2_775_000
    assert breakdown["total_outlay"] > breakdown["total_upfront"]

def test_aqi_categories():
    assert aqi_category(None) == "Unavailable"
    assert aqi_category(35) == "Good"
    assert aqi_category(80) == "Satisfactory"
    assert aqi_category(180) == "Moderate"
    assert aqi_category(250) == "Poor"
    assert aqi_category(350) == "Very Poor"
    assert aqi_category(450) == "Severe"

def test_recommendation_score_is_bounded():
    result = recommendation_score(5_000_000, 2_000_000, 50, 4, 3)
    assert 0 <= result["score"] <= 100
    assert set(result["factors"]) == {"affordability", "environment", "amenities", "connectivity"}

def test_recommendation_custom_weights():
    res_env_focused = recommendation_score(5_000_000, 4_000_000, 40, 3, 2, w_afford=0.1, w_env=0.7, w_amen=0.1, w_conn=0.1)
    res_afford_focused = recommendation_score(5_000_000, 4_000_000, 40, 3, 2, w_afford=0.7, w_env=0.1, w_amen=0.1, w_conn=0.1)
    assert res_env_focused["score"] != res_afford_focused["score"]

def test_chatbot_rule_responses():
    sample_data = [
        {"name": "Kukatpally", "city": "Hyderabad", "average_price": 7790000, "average_rent": 24000, "latest_aqi": 118, "aqi_category": "Moderate", "connectivity_score": 5, "amenity_count": 5},
        {"name": "Miyapur", "city": "Hyderabad", "average_price": 6990000, "average_rent": 21000, "latest_aqi": 110, "aqi_category": "Moderate", "connectivity_score": 4, "amenity_count": 4},
        {"name": "Kompally", "city": "Hyderabad", "average_price": 5800000, "average_rent": 17000, "latest_aqi": 84, "aqi_category": "Satisfactory", "connectivity_score": 3, "amenity_count": 4}
    ]
    assert chatbot_reply("hi", sample_data)["intent"] == "greeting"
    assert chatbot_reply("how much EMI on a loan", sample_data)["intent"] == "emi"
    # "AQI please" with no locality → falls through to general AQI ranking → environment_best
    assert chatbot_reply("AQI please", sample_data)["intent"] == "environment_best"

    # Locality fact queries
    kukat_query = chatbot_reply("price in Kukatpally", sample_data)
    assert kukat_query["locality"] == "Kukatpally"
    assert "77.9" in kukat_query["reply"] or "Kukatpally" in kukat_query["reply"]

    # Rent query on specific locality
    rent_query = chatbot_reply("rent in Miyapur", sample_data)
    assert rent_query["intent"] == "rent"
    assert rent_query["locality"] == "Miyapur"

    # Comparison
    comp_query = chatbot_reply("compare Kukatpally and Miyapur", sample_data)
    assert comp_query["intent"] == "compare"
    assert "Kukatpally" in comp_query["localities"]
    assert "Miyapur" in comp_query["localities"]

    # Cleanest air
    clean_query = chatbot_reply("which area has the cleanest air?", sample_data)
    assert clean_query["intent"] == "environment_best"
    assert "Kompally" in clean_query["reply"]

    # Affordable areas
    afford_query = chatbot_reply("show me affordable areas", sample_data)
    assert afford_query["intent"] == "housing_affordable"

    assert chatbot_reply("something completely unknown xyz", sample_data)["intent"] == "fallback"
