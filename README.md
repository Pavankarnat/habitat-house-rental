# habitat-house-rental

## Habitat — Smart Housing & Environmental Intelligence

Habitat is an editorial, production-style real-estate intelligence platform designed to help home seekers, renters, and urban analysts compare residential localities, evaluate housing affordability, calculate loan and ownership costs, and inspect environmental quality indicators across Hyderabad.

> **Transparency Note:** All property listings, pricing estimates, and environmental readings in this local development build represent baseline demonstration records rather than live broker quotations or real-time IoT sensors. AQI calculations use the CPCB sub-index framework for illustrative and planning analysis.

---

## Visual Design & Architecture
- **Palette**: Deep obsidian dark background (`#080C0E`), frosted glassmorphic card surfaces, glowing emerald primary accent (`#10B981`), mint highlights (`#34D399`), amber gold pricing accents (`#F59E0B`), and crisp high-contrast typography.
- **Typography**: Clean contemporary sans-serif (*Plus Jakarta Sans*) with editorial serif emphasis (*Playfair Display*).
- **Photography**: High-resolution architectural photography across residential mid-rises, gated villa townships, and tree-lined neighborhood streets.
- **Frontend**: React, TypeScript, Vite, custom responsive CSS design tokens, Recharts for analytics, Lucide React icons, and Axios.
- **Backend**: Python 3.10+ / 3.14 compatible, FastAPI, SQLAlchemy 2.0 ORM, Pydantic, direct bcrypt password hashing, and JWT bearer authentication.
- **Database**: SQLite (`backend/housing.db`) with 18 Hyderabad localities, multi-unit property records, dated historical pollutant observations, categorized amenities, saved favorites, alert rules, and audit logs.
- **Habitat Assistant**: 100% deterministic, rule-based chatbot with intent classification, factual database lookups, loan calculations, comparison generation, and in-app deep links. **No LLMs, no paid AI services, and no external API keys required.**

---

## 9 Interactive Application Views
1. **Overview (Dashboard)**: Executive hero, 4 KPI metric cards (18 localities tracked, ₹82.5L median asking price, ₹24,500 typical monthly rent, 116 median AQI index), asking price vs rent line chart across localities, explore localities list, personalized insights banner, and quick financial tools.
2. **Housing Explorer**: Property catalog with search, Buy/Rent toggle, Locality filter, Property Type (Apartment, Villa, Gated Community), Bedrooms (1–4 BHK), budget slider, sorting, and property detail modal.
3. **Environmental Insights**: Locality selector, date range, 4 air quality KPIs, historical AQI trend area chart, pollutant breakdown table (PM2.5, PM10, NO2, SO2, CO, O3), and data provenance panel.
4. **Compare Localities**: Side-by-side comparison matrix of 2 to 5 distinct localities evaluating price per sq.ft., monthly rent, sample AQI, amenity counts, connectivity, and strengths, with CSV report download.
5. **Recommendations**: Transparent, rule-based weighted recommendation engine with customizable sliders for Affordability (%), Environment (%), Amenities (%), and Connectivity (%), generating ranked fit scores (out of 5.0).
6. **Cost Calculators**:
   - *Home Loan EMI Calculator*: Reducing-balance formula, zero-interest edge cases, and circular Principal vs Interest donut chart.
   - *Total Ownership Cost Estimator*: Upfront outlay (down payment, 6% stamp duty, 1.5% registration, legal) and recurring expenses (maintenance, taxes) over a holding period.
   - *Property Price Estimator*: Floor area (sq.ft.) × Rate per sq.ft.
7. **Locality Directory**: Complete directory of all 18 Hyderabad localities with photo cards, connectivity ratings, average prices, sample AQI tags, and cataloged amenities.
8. **Saved Places & Alerts**: Shortlist manager for bookmarked localities and custom user threshold alert rules (Max Price, Max Rent, Max AQI) evaluated against current database records.
9. **Admin Console**: Role-protected management portal for Locality CRUD, property record creation, CSV bulk locality import with row-by-row error validation, and audit trail logs.
10. **Built-in Habitat Assistant**: Floating assistant providing answers to property inquiries, EMI estimations, area comparisons, and page navigation.

---

## Local Setup Instructions

### 1. Backend (Terminal 1)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python scripts\seed.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Note: If PowerShell script execution is restricted, run directly via `.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`.*

- **Backend API**: `http://127.0.0.1:8000`
- **Swagger Interactive API Docs**: `http://127.0.0.1:8000/docs`

### 2. Frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
- **Web Interface**: `http://127.0.0.1:5173`

---

## Demo Administrator Login
- **Email**: `admin@housing.local`
- **Password**: `ChangeMe123!`

---

## Automated Test Execution

### Backend Pytest Suite (21 Tests)
Run from `backend` with the virtual environment:
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```
**Results: 21 passed in 1.57s**
- `test_health_check`
- `test_dashboard_metrics`
- `test_localities_endpoint`
- `test_housing_filter_bhk`
- `test_emi_api_calculation`
- `test_emi_zero_interest_api`
- `test_ownership_cost_api`
- `test_locality_comparison_api`
- `test_recommendation_api`
- `test_chatbot_query_api`
- `test_auth_login_seeded_admin`
- `test_price_estimate`
- `test_price_rejects_invalid_values`
- `test_emi_zero_interest`
- `test_emi_regular_interest`
- `test_emi_rejects_invalid_inputs`
- `test_ownership_cost_calculation`
- `test_aqi_categories`
- `test_recommendation_score_is_bounded`
- `test_recommendation_custom_weights`
- `test_chatbot_rule_responses`

### Frontend Production Build
```powershell
cd frontend
npm run build
```
**Results: TypeScript 5.7 & Vite 6 production bundle builds cleanly with 0 errors.**
