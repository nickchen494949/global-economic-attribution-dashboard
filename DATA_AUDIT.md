# 📊 Complete Data Audit Report
> **Last Updated:** 2026-06-05T02:15:44Z  
> **Total Countries:** 37  
> **Global Fill Rate:** 767 / 888 = **86.4%**

---

## 1. Per-Field Coverage (24 Macro Indicators)

| # | Indicator | Fill Rate | Source Breakdown | Missing Countries |
|---|-----------|-----------|-----------------|-------------------|
| 1 | **GDP Growth** | ✅ 37/37 (100%) | WB:36 TE:1 | — |
| 2 | **PMI** | 🟡 33/37 (89%) | TE:33 | CL, AR, PK, BD |
| 3 | **Industrial Production** | ✅ 37/37 (100%) | WB:35 TE:2 | — |
| 4 | **Retail Sales** | 🟡 35/37 (95%) | WB:34 TE:1 | QA, NG |
| 5 | **Exports** | 🟡 35/37 (95%) | WB:33 TE:2 | QA, NG |
| 6 | **Unemployment** | ✅ 37/37 (100%) | WB:36 TE:1 | — |
| 7 | **Wage Growth** | 🟠 27/37 (73%) | TE:27 | TH, PH, IN, PK, BD, AE, QA, EG, NG, KE |
| 8 | **Jobless Claims** | ❌ 2/37 (5%) | TE:2 | 35 countries |
| 9 | **CPI YoY** | ✅ 37/37 (100%) | WB:36 TE:1 | — |
| 10 | **Core CPI** | 🟡 30/37 (81%) | TE:30 | HK, IN, BD, SA, AE, QA, KE |
| 11 | **PPI** | 🟡 33/37 (89%) | TE:33 | VN, BD, AE, NG |
| 12 | **Food/Energy Pressure** | 🟡 30/37 (81%) | Derived:30 | HK, IN, BD, SA, AE, QA, KE |
| 13 | **Current Acct % GDP** | ✅ 37/37 (100%) | WB:36 TE:1 | — |
| 14 | **Trade Balance** | ✅ 37/37 (100%) | WB:35 TE:2 | — |
| 15 | **FX Reserves** | ✅ 37/37 (100%) | WB:36 TE:1 | — |
| 16 | **Export Growth** | 🟡 33/37 (89%) | WB:33 | CN, TW, QA, NG |
| 17 | **Import Growth** | 🟡 35/37 (95%) | WB:33 TE:2 | QA, NG |
| 18 | **Fiscal Balance % GDP** | ✅ 37/37 (100%) | TE:37 | — |
| 19 | **Govt Debt % GDP** | 🟡 36/37 (97%) | WB:14 TE:22 | TW |
| 20 | **10Y Yield** | 🟡 31/37 (84%) | TE:31 | AR, BD, SA, AE, QA, EG |
| 21 | **Private Credit % GDP** | 🟡 32/37 (86%) | WB:32 | CA, CH, TW, SG, SA |
| 22 | **Bank Lending Rate** | ✅ 37/37 (100%) | TE:37 | — |
| 23 | **Household Debt** | 🟠 27/37 (73%) | TE:27 | TW, VN, PH, PK, BD, AE, QA, EG, NG, KE |
| 24 | **Corporate Debt** | ❌ 15/37 (41%) | TE:15 | 22 countries |

### Source Legend
- **WB** = World Bank Open Data API (structural/annual data, has proper z-scores)
- **TE** = TradingEconomics web scrape (real-time/high-frequency)
- **Derived** = Computed from other fields (e.g. Food/Energy = CPI − Core CPI)

---

## 2. Per-Country Coverage

| Country | Code | Fill | Rate | Missing Fields |
|---------|------|------|------|----------------|
| 🇺🇸 United States | US | 24/24 | ✅ 100.0% | — |
| 🇫🇷 France | FR | 24/24 | ✅ 100.0% | — |
| 🇬🇧 United Kingdom | GB | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇩🇪 Germany | DE | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇳🇱 Netherlands | NL | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇸🇪 Sweden | SE | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇵🇱 Poland | PL | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇹🇷 Turkey | TR | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇯🇵 Japan | JP | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇰🇷 South Korea | KR | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇲🇽 Mexico | MX | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇦🇺 Australia | AU | 23/24 | ✅ 95.8% | Jobless Claims |
| 🇨🇦 Canada | CA | 22/24 | ✅ 91.7% | Jobless Claims, Pvt Credit |
| 🇨🇭 Switzerland | CH | 22/24 | ✅ 91.7% | Jobless Claims, Pvt Credit |
| 🇧🇷 Brazil | BR | 22/24 | ✅ 91.7% | Jobless Claims, Corporate Debt |
| 🇨🇱 Chile | CL | 22/24 | ✅ 91.7% | PMI, Jobless Claims |
| 🇲🇾 Malaysia | MY | 22/24 | ✅ 91.7% | Jobless Claims, Corporate Debt |
| 🇮🇩 Indonesia | ID | 22/24 | ✅ 91.7% | Jobless Claims, Corporate Debt |
| 🇳🇿 New Zealand | NZ | 22/24 | ✅ 91.7% | Jobless Claims, Corporate Debt |
| 🇿🇦 South Africa | ZA | 22/24 | ✅ 91.7% | Jobless Claims, Corporate Debt |
| 🇨🇳 China | CN | 21/24 | 🟡 87.5% | Jobless Claims, Export Growth, Corporate Debt |
| 🇸🇬 Singapore | SG | 21/24 | 🟡 87.5% | Jobless Claims, Pvt Credit, Corporate Debt |
| 🇹🇭 Thailand | TH | 21/24 | 🟡 87.5% | Wage Growth, Jobless Claims, Corporate Debt |
| 🇦🇷 Argentina | AR | 20/24 | 🟡 83.3% | PMI, Jobless Claims, 10Y Yield, Corporate Debt |
| 🇭🇰 Hong Kong | HK | 20/24 | 🟡 83.3% | Jobless Claims, Core CPI, Food/Energy, Corporate Debt |
| 🇻🇳 Vietnam | VN | 20/24 | 🟡 83.3% | Jobless Claims, PPI, Household Debt, Corporate Debt |
| 🇵🇭 Philippines | PH | 20/24 | 🟡 83.3% | Wage Growth, Jobless Claims, Household Debt, Corporate Debt |
| 🇮🇳 India | IN | 19/24 | 🟡 79.2% | Wage Growth, Jobless Claims, Core CPI, Food/Energy, Corporate Debt |
| 🇵🇰 Pakistan | PK | 19/24 | 🟡 79.2% | PMI, Wage Growth, Jobless Claims, Household Debt, Corporate Debt |
| 🇪🇬 Egypt | EG | 19/24 | 🟡 79.2% | Wage Growth, Jobless Claims, 10Y Yield, Household Debt, Corporate Debt |
| 🇹🇼 Taiwan | TW | 18/24 | 🟡 75.0% | Jobless Claims, Export Growth, Govt Debt, Pvt Credit, Household Debt, Corporate Debt |
| 🇸🇦 Saudi Arabia | SA | 18/24 | 🟡 75.0% | Jobless Claims, Core CPI, Food/Energy, 10Y Yield, Pvt Credit, Corporate Debt |
| 🇰🇪 Kenya | KE | 18/24 | 🟡 75.0% | Wage Growth, Jobless Claims, Core CPI, Food/Energy, Household Debt, Corporate Debt |
| 🇦🇪 UAE | AE | 16/24 | 🟠 66.7% | Wage Growth, Jobless Claims, Core CPI, PPI, Food/Energy, 10Y Yield, Household Debt, Corporate Debt |
| 🇧🇩 Bangladesh | BD | 15/24 | 🟠 62.5% | PMI, Wage Growth, Jobless Claims, Core CPI, PPI, Food/Energy, 10Y Yield, Household Debt, Corporate Debt |
| 🇳🇬 Nigeria | NG | 15/24 | 🟠 62.5% | Retail Sales, Exports, Wage Growth, Jobless Claims, PPI, Export Growth, Import Growth, Household Debt, Corporate Debt |
| 🇶🇦 Qatar | QA | 13/24 | ❌ 54.2% | Retail Sales, Exports, Wage Growth, Jobless Claims, Core CPI, Food/Energy, Export Growth, Import Growth, 10Y Yield, Household Debt, Corporate Debt |

---

## 3. Asset Data Coverage

| Asset Class | Coverage | Notes |
|-------------|----------|-------|
| **Equity (ETF)** | 35/37 (94.6%) | Missing: BD (Bangladesh), KE (Kenya) — no US-listed ETF |
| **Currency (FX)** | 37/37 (100%) | All pairs via Yahoo Finance |
| **Bonds (Proxy)** | 4/37 (10.8%) | US (TLT), UK (IGLT.L), CN (CBON), JP (BNDX) only |

---

## 4. Why Some Data Is Impossible to Get

> [!IMPORTANT]
> The following gaps are **structurally impossible** to fill via free public APIs:

| Field | Fill Rate | Root Cause |
|-------|-----------|------------|
| **Jobless Claims** | 2/37 | Only US & France publish weekly claims data publicly. Most countries don't track this metric. |
| **Corporate Debt/GDP** | 15/37 | TradingEconomics only lists this for ~15 countries. BIS has broader data but requires institutional access. |
| **Sovereign CDS** | 0/37 | Bloomberg/Refinitiv terminal only. No free public source exists. |
| **Credit Spread** | 0/37 | Same — requires institutional data feeds. |
| **Bank Stock Performance** | 0/37 | Would require building a custom basket of bank stocks per country. |
| **Taiwan (TW)** | 75% | Not a UN member → World Bank excludes them entirely. All TW data sourced from TradingEconomics only. |

---

## 5. Data Source Breakdown (Total Fields)

```
World Bank API    : 396 fields (51.5%)
TradingEconomics  : 341 fields (44.4%)
Derived (Computed):  30 fields ( 3.9%)
Missing           : 121 fields
─────────────────────────────────────
Total             : 888 fields
Available         : 767 fields (86.4%)
```

---

## 6. Auto-Update System

The background auto-updater runs every 60 minutes with this pipeline:

```
Step 1: Yahoo Finance  → Equity, Currency, Bond, Futures prices
Step 2: TradingEcon    → PMI, Yields, Wage Growth, Core CPI, etc.
Step 3: World Bank     → GDP, Unemployment, CPI, Trade (merges, doesn't overwrite)
Step 4: TradingEcon    → Deep scrape to fill remaining gaps  
Step 5: Post-process   → Recalculate z-scores, percentiles, composites
Step 6: TypeScript     → Build production bundle
```
