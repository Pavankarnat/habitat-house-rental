from math import isfinite
import re

def estimate_price(area_sqft: float, rate_per_sqft: float) -> float:
    if not isfinite(area_sqft) or not isfinite(rate_per_sqft) or area_sqft <= 0 or rate_per_sqft <= 0:
        raise ValueError("Area and rate must be positive finite numbers")
    return round(area_sqft * rate_per_sqft, 2)

def calculate_emi(principal: float, annual_interest_rate: float, tenure_years: int) -> dict:
    if principal <= 0 or annual_interest_rate < 0 or tenure_years <= 0:
        raise ValueError("Loan amount and tenure must be positive; interest cannot be negative")
    n = tenure_years * 12
    monthly_rate = annual_interest_rate / 1200
    if monthly_rate == 0:
        emi = principal / n
    else:
        emi = principal * monthly_rate * ((1 + monthly_rate) ** n) / (((1 + monthly_rate) ** n) - 1)
    total = emi * n
    return {
        "monthly_emi": round(emi, 2),
        "total_payment": round(total, 2),
        "total_interest": round(total - principal, 2),
        "tenure_months": n,
        "principal": principal
    }

def calculate_ownership_breakdown(
    property_price: float,
    down_payment_percent: float = 20.0,
    annual_interest_rate: float = 8.5,
    tenure_years: int = 20,
    stamp_duty_percent: float = 6.0,
    registration_percent: float = 1.5,
    monthly_maintenance: float = 3500.0,
    annual_property_tax: float = 12000.0,
    annual_insurance: float = 8000.0,
    holding_years: int = 5
) -> dict:
    if property_price <= 0:
        raise ValueError("Property price must be positive")
    
    down_payment = round(property_price * (down_payment_percent / 100.0), 2)
    loan_principal = round(property_price - down_payment, 2)
    
    # One-time closing costs
    stamp_duty = round(property_price * (stamp_duty_percent / 100.0), 2)
    registration = round(property_price * (registration_percent / 100.0), 2)
    legal_and_misc = 25000.0
    total_upfront = round(down_payment + stamp_duty + registration + legal_and_misc, 2)
    
    # Loan EMI
    emi_info = calculate_emi(loan_principal, annual_interest_rate, tenure_years)
    monthly_emi = emi_info["monthly_emi"]
    
    # Recurring costs over holding period
    total_emi_paid = round(monthly_emi * holding_years * 12, 2)
    total_maintenance = round(monthly_maintenance * holding_years * 12, 2)
    total_taxes = round((annual_property_tax + annual_insurance) * holding_years, 2)
    
    # Total ownership cash outlay over the period
    total_outlay = round(total_upfront + total_emi_paid + total_maintenance + total_taxes, 2)
    
    return {
        "property_price": property_price,
        "down_payment": down_payment,
        "loan_principal": loan_principal,
        "stamp_duty": stamp_duty,
        "registration": registration,
        "total_upfront": total_upfront,
        "monthly_emi": monthly_emi,
        "monthly_maintenance": monthly_maintenance,
        "total_monthly_commitment": round(monthly_emi + monthly_maintenance, 2),
        "holding_years": holding_years,
        "total_outlay": total_outlay
    }

def aqi_category(aqi: int | None) -> str:
    if aqi is None:
        return "Unavailable"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Satisfactory"
    if aqi <= 200:
        return "Moderate"
    if aqi <= 300:
        return "Poor"
    if aqi <= 400:
        return "Very Poor"
    return "Severe"

def recommendation_score(
    budget: float,
    price: float,
    aqi: int | None,
    connectivity: int,
    amenity_count: int,
    w_afford: float = 0.40,
    w_env: float = 0.30,
    w_amen: float = 0.20,
    w_conn: float = 0.10
) -> dict:
    affordability = max(0, min(100, 100 * (1 - price / max(budget, 1)))) if budget > 0 else 50
    environment = 50 if aqi is None else max(0, min(100, 100 - (aqi / 3.5)))
    amenities = min(100, amenity_count * 20)
    connectivity_score = max(0, min(100, connectivity * 20))
    
    total_weight = w_afford + w_env + w_amen + w_conn or 1.0
    score = round(
        (w_afford * affordability + w_env * environment + w_amen * amenities + w_conn * connectivity_score) / total_weight,
        1
    )
    return {
        "score": score,
        "factors": {
            "affordability": round(affordability, 1),
            "environment": round(environment, 1),
            "amenities": round(amenities, 1),
            "connectivity": round(connectivity_score, 1)
        }
    }

def _fmt_money(v: float | None) -> str:
    if v is None:
        return "—"
    if v >= 10000000:
        return f"₹{v/10000000:.1f} Cr"
    if v >= 100000:
        return f"₹{v/100000:.1f} L"
    return f"₹{v:,.0f}"

def _parse_amount(text: str) -> float | None:
    # Matches patterns like 40 lakhs, 50L, 1.2 cr, 80 lac, 5000000, 25k
    cr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)\b", text)
    if cr_match:
        return float(cr_match.group(1)) * 10000000
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b", text)
    if lakh_match:
        return float(lakh_match.group(1)) * 100000
    k_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand)\b", text)
    if k_match:
        return float(k_match.group(1)) * 1000
    num_match = re.search(r"\b(\d{5,9})\b", text)
    if num_match:
        return float(num_match.group(1))
    return None

def _parse_rate(text: str, default: float = 8.5) -> float:
    rate_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:%|percent)", text)
    if rate_match:
        val = float(rate_match.group(1))
        if 1.0 <= val <= 30.0:
            return val
    return default

def _parse_tenure(text: str, default: int = 20) -> int:
    tenure_match = re.search(r"(\d+)\s*(?:year|years|yr|yrs)\b", text)
    if tenure_match:
        val = int(tenure_match.group(1))
        if 1 <= val <= 40:
            return val
    return default

def _parse_area(text: str) -> float | None:
    area_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:sqft|sft|sq\.?\s*ft|square\s*feet)\b", text)
    if area_match:
        return float(area_match.group(1))
    return None

def chatbot_reply(message: str, localities: list[dict]) -> dict:
    text = message.lower().strip()
    
    # 1. Greetings
    if re.search(r"\b(hello|hi|hey|greetings|hola)\b", text) or any(x in text for x in ["good morning", "good evening", "good afternoon"]):
        return {
            "reply": "Hello! I’m Habitat Assistant. I can execute live calculations, look up property prices, compare localities, estimate ownership costs, and check verified CPCB air quality indices across Hyderabad.",
            "intent": "greeting",
            "suggestions": [
                "Calculate EMI for ₹50 Lakhs",
                "Estimate ownership cost for ₹85 Lakhs",
                "Compare Kukatpally and Miyapur",
                "Which locality has cleanest air?",
                "Estimate 1500 sqft in Gachibowli"
            ]
        }

    # 2. Live EMI Calculation in chat
    if "emi" in text or "loan" in text or "repayment" in text:
        principal = _parse_amount(text) or 4000000.0
        rate = _parse_rate(text, 8.5)
        tenure = _parse_tenure(text, 20)
        
        emi_calc = calculate_emi(principal, rate, tenure)
        monthly_emi = emi_calc["monthly_emi"]
        total_int = emi_calc["total_interest"]
        total_pay = emi_calc["total_payment"]
        
        reply = (
            f"Here is your loan EMI calculation for {_fmt_money(principal)}:\n"
            f"• Monthly EMI: {_fmt_money(monthly_emi)} / month\n"
            f"• Principal Loan: {_fmt_money(principal)}\n"
            f"• Annual Interest Rate: {rate}%\n"
            f"• Loan Tenure: {tenure} years ({tenure * 12} instalments)\n"
            f"• Total Interest: {_fmt_money(total_int)}\n"
            f"• Total Repayment: {_fmt_money(total_pay)}\n\n"
            f"Open Cost Calculators to customize pre-payments or test zero-interest scenarios."
        )
        return {
            "reply": reply,
            "intent": "emi",
            "action": "/calculators",
            "data": emi_calc,
            "suggestions": [
                f"Calculate EMI for {_fmt_money(principal * 1.5)}",
                f"Ownership cost for {_fmt_money(principal)}",
                "Compare affordable localities"
            ]
        }

    # 3. Total Cost of Ownership calculation in chat
    if any(k in text for k in ["ownership cost", "cost of ownership", "cost to own", "total cost"]):
        prop_price = _parse_amount(text) or 8500000.0
        holding = 5
        down_payment = prop_price * 0.20
        loan_amount = prop_price * 0.80
        stamp_duty = prop_price * 0.06
        registration = prop_price * 0.015
        maintenance_5yr = 3500 * 12 * holding
        prop_tax_5yr = 12000 * holding
        insurance_5yr = 8000 * holding
        
        emi_calc = calculate_emi(loan_amount, 8.5, 20)
        loan_paid_5yr = emi_calc["monthly_emi"] * 12 * holding
        total_outflow = down_payment + stamp_duty + registration + maintenance_5yr + prop_tax_5yr + insurance_5yr + loan_paid_5yr
        
        reply = (
            f"Total 5-Year Ownership Breakdown for {_fmt_money(prop_price)} property:\n"
            f"• Down Payment (20%): {_fmt_money(down_payment)}\n"
            f"• Stamp Duty (6%) + Registration (1.5%): {_fmt_money(stamp_duty + registration)}\n"
            f"• 5-Year Maintenance (@ ₹3,500/mo): {_fmt_money(maintenance_5yr)}\n"
            f"• 5-Year Taxes & Insurance: {_fmt_money(prop_tax_5yr + insurance_5yr)}\n"
            f"• 5-Year Loan Payments: {_fmt_money(loan_paid_5yr)}\n"
            f"• Estimated 5-Year Net Outflow: {_fmt_money(total_outflow)}\n\n"
            f"Explore the interactive Ownership Cost Calculator for customized holding periods."
        )
        return {
            "reply": reply,
            "intent": "ownership_calculated",
            "action": "/calculators",
            "suggestions": [
                f"Calculate EMI for {_fmt_money(loan_amount)}",
                "Rent vs Buy analysis",
                "Areas with cleanest air"
            ]
        }

    # Robust locality name matching using word-boundary regex to handle multi-word names
    # e.g. 'LB Nagar', 'Financial District', 'Hitec City' without false partial matches
    def _loc_matches(loc_name: str, query: str) -> bool:
        escaped = re.escape(loc_name.lower())
        return bool(re.search(r'\b' + escaped + r'\b', query))
    matched_locs = [loc for loc in localities if _loc_matches(loc["name"], text)]

    # 4a. Square Footage Price Estimation
    area_sqft = _parse_area(text)
    if area_sqft and matched_locs:
        target = matched_locs[0]
        # Use actual rate per sqft from property data if available
        # Stored average_price reflects the average across 5 property variants with avg ~1450 sqft
        avg_sqft = 1450.0
        avg_rate = round(target["average_price"] / avg_sqft) if target.get("average_price") else 6800
        est_price = round(area_sqft * avg_rate)
        est_rent = round((est_price * 0.035) / 12)
        reply = (
            f"Property Value Estimation for {int(area_sqft):,} sq.ft. in {target['name']}:\n"
            f"• Locality Rate: ~₹{avg_rate:,} / sq.ft.\n"
            f"• Estimated Purchase Price: {_fmt_money(est_price)}\n"
            f"• Estimated Monthly Rental Value: {_fmt_money(est_rent)} / month\n"
            f"• Connectivity: {target.get('connectivity_score', 3)}/5 · CPCB AQI: {target.get('latest_aqi', '—')}\n\n"
            f"Would you like to calculate monthly EMI for this property value?"
        )
        return {
            "reply": reply,
            "intent": "area_price_estimated",
            "action": "/calculators",
            "suggestions": [
                f"Calculate EMI for {_fmt_money(est_price)}",
                f"Compare {target['name']} and Gachibowli",
                "Show properties in " + target["name"]
            ]
        }

    # 4b. Compare multiple localities
    if ("compare" in text or "versus" in text or " vs " in text or len(matched_locs) >= 2) and len(matched_locs) >= 2:
        loc1, loc2 = matched_locs[0], matched_locs[1]
        p1, p2 = _fmt_money(loc1.get("average_price")), _fmt_money(loc2.get("average_price"))
        r1, r2 = _fmt_money(loc1.get("average_rent")), _fmt_money(loc2.get("average_rent"))
        aqi1, aqi2 = loc1.get("latest_aqi", "—"), loc2.get("latest_aqi", "—")
        c1, c2 = loc1.get("connectivity_score", 3), loc2.get("connectivity_score", 3)
        amen1, amen2 = loc1.get("amenity_count", 4), loc2.get("amenity_count", 4)
        
        reply = (
            f"Comparative Analysis: {loc1['name']} vs {loc2['name']}\n"
            f"• Average Property Price: {loc1['name']} ({p1}) vs {loc2['name']} ({p2})\n"
            f"• Typical Monthly Rent: {loc1['name']} ({r1}) vs {loc2['name']} ({r2})\n"
            f"• Air Quality Index (AQI): {loc1['name']} ({aqi1}) vs {loc2['name']} ({aqi2})\n"
            f"• Connectivity Score: {loc1['name']} ({c1}/5) vs {loc2['name']} ({c2}/5)\n"
            f"• Cataloged Amenities: {loc1['name']} ({amen1}) vs {loc2['name']} ({amen2})\n\n"
            f"Click below to explore the comprehensive comparison matrix."
        )
        return {
            "reply": reply,
            "intent": "compare",
            "action": "/compare",
            "localities": [loc1["name"], loc2["name"]],
            "suggestions": [
                f"Calculate EMI in {loc1['name']}",
                f"Calculate EMI in {loc2['name']}",
                "Areas with cleanest air"
            ]
        }

    # 4c. Specific locality inquiries
    if matched_locs:
        target = matched_locs[0]
        avg_p = _fmt_money(target.get("average_price"))
        avg_r = _fmt_money(target.get("average_rent"))
        aqi = target.get("latest_aqi", 100)
        cat = target.get("aqi_category", "Moderate")
        amen_count = target.get("amenity_count", 4)
        conn = target.get("connectivity_score", 3)

        if any(w in text for w in ["rent", "monthly", "tenant", "lease"]):
            return {
                "reply": (
                    f"Rental Market — {target['name']}:\n"
                    f"• Typical 2 BHK Monthly Rent: {avg_r}/month\n"
                    f"• Average Property Purchase Price: {avg_p}\n"
                    f"• Rental Yield: ~{round(target['average_rent']*12/target['average_price']*100, 1) if target.get('average_price') and target.get('average_rent') else '3.5'}%\n"
                    f"• Connectivity Score: {conn}/5 · AQI: {aqi} ({cat})\n\n"
                    f"Open Housing Explorer to filter active rental listings by BHK and budget."
                ),
                "intent": "rent",
                "action": "/housing",
                "locality": target["name"],
                "suggestions": [f"Price in {target['name']}", f"Compare {target['name']} and Miyapur", "Calculate EMI"]
            }
        elif any(w in text for w in ["aqi", "air", "pollution", "environment", "smog", "quality"]):
            # Health context based on AQI band
            health_note = {
                "Good": "Air quality is excellent — suitable for outdoor activities.",
                "Satisfactory": "Acceptable air quality with minimal risk for most residents.",
                "Moderate": "Moderate pollution — sensitive groups may experience mild discomfort.",
                "Poor": "Poor air quality — limit prolonged outdoor exposure.",
                "Very Poor": "Very poor air — avoid outdoor activities, especially for children.",
                "Severe": "Hazardous conditions — stay indoors and use air purifiers.",
            }.get(cat, "No health advisory available.")
            return {
                "reply": (
                    f"Air Quality Report — {target['name']}:\n"
                    f"• CPCB AQI Index: {aqi} ({cat})\n"
                    f"• Health Advisory: {health_note}\n"
                    f"• PM2.5 approx: {round(aqi * 0.38, 1)} µg/m³ · PM10 approx: {round(aqi * 0.74, 1)} µg/m³\n\n"
                    f"Environmental Insights tracks 90-day pollution trend history for this locality."
                ),
                "intent": "environment",
                "action": "/environment",
                "locality": target["name"],
                "suggestions": ["Localities with cleanest air", f"Price in {target['name']}", "Compare localities"]
            }
        elif any(w in text for w in ["amenity", "amenities", "school", "hospital", "metro", "park", "transit", "infrastructure"]):
            return {
                "reply": (
                    f"Infrastructure — {target['name']}:\n"
                    f"• {amen_count} verified amenities catalogued (hospitals, schools, metro, parks, markets)\n"
                    f"• Connectivity Score: {conn}/5\n"
                    f"• City: {target.get('city', 'Hyderabad')}\n\n"
                    f"Open Locality Directory to browse the full amenity list for {target['name']}."
                ),
                "intent": "amenities",
                "action": "/localities",
                "locality": target["name"],
                "suggestions": [f"Show properties in {target['name']}", "Compare localities", "Calculate EMI"]
            }
        else:
            # Derive price per sqft for context (avg ~1450 sqft across 5 variants)
            rate = round(target['average_price'] / 1450) if target.get('average_price') else None
            rate_str = f"₹{rate:,}/sq.ft." if rate else "—"
            return {
                "reply": (
                    f"Locality Profile: {target['name']} ({target.get('city', 'Hyderabad')})\n"
                    f"• Average Property Value: {avg_p} (≈ {rate_str})\n"
                    f"• Typical 2 BHK Monthly Rent: {avg_r}/month\n"
                    f"• Air Quality Index: {aqi} ({cat})\n"
                    f"• Connectivity: {conn}/5 · Key Amenities: {amen_count}\n\n"
                    f"Click below to explore properties and environmental indicators in {target['name']}."
                ),
                "intent": "locality_summary",
                "action": "/housing",
                "locality": target["name"],
                "suggestions": [
                    f"Calculate EMI for {avg_p}",
                    f"Compare {target['name']} and Kukatpally",
                    "Areas with cleanest air"
                ]
            }

    # 5. Cleanest air quality / environmental rankings & general AQI queries
    if any(k in text for k in ["aqi", "air quality", "pollution", "environment", "cleanest", "best air", "lowest aqi", "greenest", "fresh air", "clean air"]):
        sorted_by_aqi = sorted([l for l in localities if l.get("latest_aqi") is not None], key=lambda x: x["latest_aqi"])
        if sorted_by_aqi:
            top = sorted_by_aqi[:4]
            names_aqi = "\n".join([f"• {x['name']}: AQI {x['latest_aqi']} ({x.get('aqi_category', 'Satisfactory')}) · Avg Price {_fmt_money(x.get('average_price'))}" for x in top])
            return {
                "reply": (
                    f"Top Hyderabad Localities with the Cleanest Air Quality:\n{names_aqi}\n\n"
                    f"These suburban corridors and green belts maintain lower particulate counts. Open Environmental Insights for historical trends."
                ),
                "intent": "environment_best",
                "action": "/environment",
                "suggestions": [f"Tell me about {top[0]['name']}", "Compare top clean localities", "Calculate loan EMI"]
            }

    # 6. Cheapest / Affordable areas
    if any(k in text for k in ["cheapest", "affordable", "budget", "lowest price", "low cost", "entry level"]):
        sorted_by_price = sorted([l for l in localities if l.get("average_price")], key=lambda x: x["average_price"])
        if sorted_by_price:
            top = sorted_by_price[:4]
            lines = []
            for x in top:
                emi = calculate_emi(x['average_price'] * 0.8, 8.5, 20)["monthly_emi"] if x.get('average_price') else None
                emi_str = f" · EMI ~₹{emi:,.0f}/mo" if emi else ""
                lines.append(f"• {x['name']}: Avg {_fmt_money(x['average_price'])} · Rent {_fmt_money(x.get('average_rent'))}/mo · AQI {x.get('latest_aqi', '—')}{emi_str}")
            names_price = "\n".join(lines)
            return {
                "reply": (
                    f"Most Affordable Monitored Localities in Hyderabad:\n{names_price}\n\n"
                    f"EMI estimates assume 80% loan at 8.5% for 20 years. These neighbourhoods offer strong value and accessible entry points."
                ),
                "intent": "housing_affordable",
                "action": "/housing",
                "suggestions": [f"Calculate EMI for {top[0]['name']}", f"Compare {top[0]['name']} and {top[1]['name']}", "Areas with cleanest air"]
            }

    # 7. Most expensive / premium areas
    if any(k in text for k in ["expensive", "premium", "luxury", "most costly", "highest price", "upscale", "elite"]):
        sorted_by_price_desc = sorted([l for l in localities if l.get("average_price")], key=lambda x: x["average_price"], reverse=True)
        if sorted_by_price_desc:
            top = sorted_by_price_desc[:4]
            names_price = "\n".join([f"• {x['name']}: Avg {_fmt_money(x['average_price'])} · Rent {_fmt_money(x.get('average_rent'))}/mo · Connectivity {x.get('connectivity_score', 3)}/5" for x in top])
            return {
                "reply": (
                    f"Premium Localities in Hyderabad (Highest Average Property Values):\n{names_price}\n\n"
                    f"These elite corridors command premium prices due to location, infrastructure, and lifestyle amenities."
                ),
                "intent": "housing_premium",
                "action": "/housing",
                "suggestions": [f"Calculate EMI for {_fmt_money(sorted_by_price_desc[0]['average_price'])}", "Compare top localities", "Calculate EMI"]
            }

    # 8. Best connectivity / transport-focused query
    if any(k in text for k in ["connectivity", "transport", "metro", "commute", "well connected", "transit"]):
        sorted_by_conn = sorted([l for l in localities], key=lambda x: x.get("connectivity_score", 0), reverse=True)
        top = sorted_by_conn[:4]
        names_conn = "\n".join([f"• {x['name']}: Connectivity {x.get('connectivity_score', 3)}/5 · Avg Price {_fmt_money(x.get('average_price'))} · AQI {x.get('latest_aqi', '—')}" for x in top])
        return {
            "reply": (
                f"Best Connected Localities in Hyderabad (Metro, ORR, Major Roads):\n{names_conn}\n\n"
                f"These areas have excellent metro rail access, flyover connectivity, and proximity to major IT corridors."
            ),
            "intent": "connectivity",
            "action": "/localities",
            "suggestions": [f"Tell me about {top[0]['name']}", "Compare top localities", "Most affordable areas"]
        }

    # 9. Best for families
    if any(k in text for k in ["family", "families", "children", "kids", "school", "safe", "residential", "peaceful"]):
        # Score by: low AQI + high amenities + medium price
        family_sorted = sorted(
            [l for l in localities if l.get("latest_aqi") and l.get("average_price")],
            key=lambda x: (x.get("latest_aqi", 200), -x.get("amenity_count", 0))
        )
        top = family_sorted[:4]
        names_family = "\n".join([f"• {x['name']}: AQI {x['latest_aqi']} ({x.get('aqi_category', '—')}) · Amenities: {x.get('amenity_count', 0)} · Avg {_fmt_money(x.get('average_price'))}" for x in top])
        return {
            "reply": (
                f"Best Localities for Families in Hyderabad (Low Pollution + Good Amenities):\n{names_family}\n\n"
                f"Ranked by cleaner air, school access, hospitals, and parks — key priorities for family living."
            ),
            "intent": "family_friendly",
            "action": "/recommendations",
            "suggestions": [f"Tell me about {top[0]['name']}", "Most affordable areas", "Calculate EMI"]
        }

    # 10. Rent vs Buy advisory
    if any(k in text for k in ["rent vs buy", "rent or buy", "should i rent", "should i buy", "buy vs rent"]):
        reply = (
            "Rent vs Buy Financial Framework (Hyderabad Market):\n"
            "• Average Rental Yield: 3.2% - 3.8% (e.g. ₹25k/mo on a ₹85L property)\n"
            "• Home Loan Interest Rate: ~8.5% reducing balance\n"
            "• Decision Rule: If you plan to reside in Hyderabad for 5+ years, purchasing builds home equity and shields against rental inflation.\n"
            "• If holding tenure is under 3 years, renting offers greater liquidity and avoids stamp duty (6%) and registration (1.5%) transaction overheads.\n\n"
            "Use our Cost Calculators to evaluate your personalized holding cost."
        )
        return {
            "reply": reply,
            "intent": "rent_vs_buy",
            "action": "/calculators",
            "suggestions": ["Calculate EMI for ₹60 Lakhs", "Ownership cost for ₹85 Lakhs", "Show affordable localities"]
        }


    # 8. Recommendations by budget
    if "recommend" in text or "suggest" in text or "best area" in text or "where to buy" in text or "where should i live" in text:
        budget = _parse_amount(text)
        if budget:
            matching = [l for l in localities if l.get("average_price") and l["average_price"] <= budget * 1.15]
            if matching:
                top_matches = sorted(matching, key=lambda x: (x.get("latest_aqi", 200), -x.get("connectivity_score", 1)))[:3]
                list_str = "\n".join([f"• {x['name']}: Avg {_fmt_money(x['average_price'])} · AQI {x.get('latest_aqi')} · Connectivity {x.get('connectivity_score', 3)}/5" for x in top_matches])
                return {
                    "reply": f"Based on your budget of {_fmt_money(budget)}, here are the top recommended localities balancing affordability and environmental quality:\n{list_str}\n\nOpen Recommendations to customize scoring weights.",
                    "intent": "recommendations",
                    "action": "/recommendations",
                    "suggestions": [f"Calculate EMI for {_fmt_money(budget)}", "Compare these localities", "Cleanest air localities"]
                }
        return {
            "reply": "Habitat evaluates localities using a balanced multi-criteria algorithm: Affordability (40%), Environment (30%), Amenities (20%), and Connectivity (10%). Open Recommendations to set your budget.",
            "intent": "recommendations",
            "action": "/recommendations",
            "suggestions": ["Recommend for ₹50 Lakhs", "Recommend for ₹80 Lakhs", "Areas with cleanest air"]
        }

    # 9. General Housing Explorer
    if any(x in text for x in ["housing", "property", "properties", "apartment", "villa", "bhk", "flat", "buy"]):
        return {
            "reply": "You can explore all cataloged apartments, villas, and multi-unit residences with BHK, budget, and price-per-square-foot filters in Housing Explorer.",
            "intent": "housing",
            "action": "/housing",
            "suggestions": ["Calculate loan EMI", "Most affordable areas", "Areas with cleanest air"]
        }

    # 10. Direct navigation shortcuts
    if "calculator" in text or "calculate" in text:
        return {
            "reply": "Navigating to Cost Calculators: test monthly loan EMI, complete 5-year ownership outlays, and square-footage rates.",
            "intent": "navigate",
            "action": "/calculators"
        }
    if "compare" in text:
        return {
            "reply": "Navigating to Locality Comparison matrix: select and contrast up to 5 localities side-by-side.",
            "intent": "navigate",
            "action": "/compare"
        }
    if "saved" in text or "alert" in text or "shortlist" in text:
        return {
            "reply": "Navigating to Saved Places & Alerts: monitor price and AQI notification thresholds.",
            "intent": "navigate",
            "action": "/saved"
        }

    # Fallback with smart prompts
    return {
        "reply": "I can calculate home loan EMI, estimate property values by square footage, compare localities, analyze ownership costs, and check verified CPCB air quality indices. Choose a topic below:",
        "intent": "fallback",
        "suggestions": [
            "Calculate EMI for ₹50 Lakhs",
            "Ownership cost for ₹85 Lakhs",
            "Compare Kukatpally and Miyapur",
            "Cleanest air localities",
            "Most affordable areas"
        ]
    }

