# Feature checklist and implementation notes

| # | Feature area | Implemented behavior | Notes |
|---:|---|---|---|
| 1 | Area-wise housing cost estimation | Property records, price per sq. ft., price calculator | Sample prices only |
| 2 | Pollution analysis | PM2.5/PM10 records and history endpoint | Seeded illustrative data |
| 3 | AQI information | Stored AQI, category and observation date | No live monitoring |
| 4 | Housing vs pollution comparison | 2–5 locality comparison table | Shows sample values side by side |
| 5 | BHK/property/rent explorer | Filters for locality, BHK, buy/rent and budget | Backend filtering |
| 6 | EMI calculator | Monthly EMI, total repayment and interest | Handles zero-interest case |
| 7 | Ownership-cost calculator | Endpoint adds down payment, purchase costs, recurring costs and EMI | Planning estimate; avoid double counting |
| 8 | Trend/forecast view | Charts sample values; forecast endpoint explains when data is insufficient | Does not fabricate forecasts |
| 9 | Locality recommendation | Weighted affordability/environment/amenities/connectivity score | Explainable rules, not AI |
| 10 | Locality and amenities browser | Directory, manually entered amenity records and amenity endpoint | No maps API |
| 11 | Favorites and saved comparisons | Authenticated favorite CRUD and saved comparison API | Frontend favorites wired; saved comparison API available |
| 12 | Threshold alerts | User-specific price/rent/AQI rules, checked when requested | In-app only, sample data only |
| 13 | Reports and exports | CSV export of locality records | No third-party service |
| 14 | Dashboard | Responsive dashboard cards and charts | Live API calls to local backend |
| 15 | Admin/data management | Admin locality CRUD, CSV locality import validation, audit log | Import format documented in README |
| + | Rule-based chatbot | Floating chat UI and deterministic backend rules for navigation/help | No LLM, no API, not general-purpose AI |

Some documented features are intentionally simplified for a local college demonstration: forecasting is withheld when dated history is insufficient; amenity and environmental records are seeded samples; alert rules are evaluated when the user opens the alert list; and CSV import currently covers locality records. These limitations are documented rather than represented as complete production capabilities.
