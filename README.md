# Global Economic Attribution Dashboard

## What Is This?

An attribution-first dashboard that answers one core question:

> **When a country's stock, bond, or currency market moves sharply, is the move caused by the whole world, the region, the same type of countries, or this country itself?**

This is **not** a trading signal system. It is a monitoring and attribution framework.

---

## Core Framework

```
Country Performance
= Global Benchmark          (β_global)
+ Regional Benchmark        (β_region)
+ Development-Stage Benchmark (β_dev_stage)
+ Global-Role Benchmark     (β_role)
+ Country Alpha / Residual  (α_country)
```

```
Country Alpha Score = Country Asset Score − Peer Benchmark Asset Score
```

---

## Country Labels

| Label | Meaning |
|-------|---------|
| **True Alpha** | Outperforming peers with fundamental support |
| **Fake Alpha** | Price looks strong, fundamentals are weak |
| **Hidden Alpha** | Strong fundamentals, market hasn't priced in yet |
| **Beta** | Moving with the peer group |
| **Crisis Risk** | Weak across assets, macro, and risk dimensions |

---

## Dashboard Pages

| Page | Purpose |
|------|---------|
| **Today** | Global regime, top countries by label, biggest residuals |
| **Country Detail** | Full profile: assets, macro, risk, alpha, peer comparison |
| **Peer Groups** | Compare countries within region/stage/role/openness groups |
| **Global Fingerprint** | Cross-asset signals (stocks, bonds, dollar, oil, copper, gold, VIX) |
| **Data Quality** | Coverage, freshness, confidence per country |

---

## Country Universe (v1)

38 countries/markets across:
- North America (3)
- Latin America (3)
- Europe (7)
- East Asia (5)
- Southeast Asia (6)
- South Asia (3)
- Middle East / North Africa (4)
- Oceania (2)
- Africa (3)

---

## Classification Dimensions

1. **Region** — 9 geographic groups
2. **Development Stage** — Developed → Frontier → Crisis/High-Risk
3. **Global Role** — Resource Exporter, Manufacturing, Tech Core, Financial Center, etc.
4. **Openness/Size** — Small Open → Large Domestic Economy
5. **External Vulnerability** — Strong / Neutral / Fragile

---

## Scoring Pipeline

```
Raw Data
→ Economic Transformation (returns, YoY, etc.)
→ Direction Adjustment (higher = better)
→ Rolling Z-Score (3Y daily, 5Y monthly, 10Y quarterly)
→ Cap to [-3, +3]
→ Percentile via Normal CDF
→ Category Score (equal-weight average)
→ Peer Benchmark Score
→ Country Alpha / Residual
```

---

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Data Pipeline**: Python (yfinance, pandas, numpy, scipy)
- **Deployment**: GitHub Pages

---

## Quick Start

### Run the dashboard (with sample data)

```bash
npm install
npm run dev
```

### Fetch live market data

```bash
pip install -r scripts/requirements.txt
python scripts/update_data.py
```

### Build for production

```bash
npm run build
```

---

## Data Sources

| Source | Data |
|--------|------|
| Yahoo Finance | ETF prices, currency pairs, equity proxies |
| FRED | US rates, DXY proxy (planned) |
| World Bank | GDP, current account, debt, inflation (planned) |

All data is freely available. No paid API keys required.

---

## Important Notes

- **v1 uses equal weights** — no optimization of thresholds
- **No buy/sell signals** — this is attribution, not advice
- **No fake data** — missing data is clearly marked
- **Sample data included** — dashboard works immediately without data fetching

---

## Project Structure

```
├── src/
│   ├── App.tsx                    # Main app with routing
│   ├── data/
│   │   ├── countries.json         # Country classifications (38 countries)
│   │   └── sample_data.ts         # Bundled sample data
│   ├── lib/
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── scoring.ts             # Z-score, percentile engine
│   │   ├── classification.ts      # Country label engine
│   │   ├── benchmarks.ts          # Peer benchmark calculator
│   │   └── fingerprints.ts        # Global regime detector
│   ├── components/
│   │   ├── today/TodayPage.tsx
│   │   ├── country/CountryDetailPage.tsx
│   │   ├── peers/PeerGroupPage.tsx
│   │   ├── fingerprint/FingerprintPage.tsx
│   │   └── quality/DataQualityPage.tsx
│   └── hooks/
│       └── useDashboardData.ts    # Data loading (live → sample fallback)
├── scripts/
│   ├── update_data.py             # Python data fetcher
│   └── requirements.txt
├── data/
│   ├── raw/                       # Raw fetched data
│   └── processed/                 # Processed JSON
└── public/
    └── data/                      # Live data for deployment
```

---

## License

This project is for educational and analytical purposes only. It does not constitute investment advice.
