# ⚡ ForecastIQ

AI-powered superforecasting platform based on Philip Tetlock's methodology, with a custom intelligence weighting system.

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
```

Open **http://localhost:3000**

---

## Features

### 🗳️ Political Forecasting (Auto)
- Submits your question to the Brave Search API
- Automatically finds and scores news articles across 6 factors
- Source credibility tiers: Reuters/AP = 1.0x, CNN/Bloomberg = 0.85x, unknown = 0.50x
- Auto-blends outside view (base rate) + inside view (news evidence)
- User-defined news window: 7–90 days

### 🛡️ National Security Politics Preset
Optimised for small state security & statecraft research (IWP):
- **Geopolitical Pressure** (25%) — external state pressure, sanctions, diplomacy
- **Regime Stability** (20%) — government cohesion, protests, opposition
- **Military Posture** (20%) — armed forces loyalty, security sector
- **External Interference** (15%) — foreign actors, proxy influence
- **Economic Coercion** (10%) — trade pressure, debt leverage
- **Media Narrative** (10%) — information environment, propaganda

### 🏆 Sports Forecasting (Manual)
- 6-factor manual entry with sliders (0–10)
- Same weighted calculation engine

### ⚡ Real-time Calculation Panel
- Terminal-style log that streams every step live
- Shows factor-by-factor scores, weight applications, blend ratios

### ⚖️ Weight Editor (`/weights`)
- Per-user, per-domain weight customisation
- Sliders + number inputs for each factor
- Live preview recalculates instantly as you drag
- Saved weights auto-apply to future forecasts

### 📊 Brier Score Tracking (`/profile`)
- Resolve forecasts as YES or NO when outcomes are known
- Brier score = (probability − outcome)²
- Calibration chart: shows how accurate your X% predictions really are
- Superforecaster benchmark: Brier < 0.10

### 🔍 Evidence Trail
- Every factor score links to the articles that drove it
- Shows source credibility tier per article
- Expandable per factor

---

## Presets

| Preset | Domain | Auto/Manual |
|---|---|---|
| Standard Politics | Elections, policy, leadership | Auto (news) |
| National Security Politics | Small state security, irregular warfare | Auto (news) |
| Sports | Any sport | Manual (sliders) |

---

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** — dark professional theme
- **Prisma 5** + **SQLite** — local database
- **Brave Search API** — news intelligence layer

---

## Project Structure

```
app/
  page.tsx              # Main forecast page
  forecasts/page.tsx    # All forecasts history
  weights/page.tsx      # Weight editor
  profile/page.tsx      # Brier scores + calibration
  api/
    forecast/route.ts   # SSE streaming forecast endpoint
    user/route.ts       # User management
    resolve/route.ts    # Forecast resolution
    weights/route.ts    # Weight persistence
lib/
  braveSearch.ts        # Brave API wrapper
  sourceCredibility.ts  # Tier 1–4 source scoring
  baseRates.ts          # Reference class lookup (15+ types)
  weightCalculator.ts   # Core streaming calculation engine
  prisma.ts             # Prisma client
prisma/
  schema.prisma         # DB schema
```

---

## Environment

`.env` (already configured):
```
DATABASE_URL="file:./prisma/dev.db"
BRAVE_API_KEY="your_key_here"
```

---

## Methodology

Based on Philip Tetlock's *Superforecasting* (2015):

1. **Outside View** — base rate from reference class (e.g. "incumbent wins re-election: 65%")
2. **Inside View** — 6 domain-specific factors scored from live news
3. **Auto-blend** — ratio adjusted by news data quality (HIGH = 35/65, LOW = 55/45)
4. **Brier scoring** — tracks calibration over time
5. **Custom weights** — your alteration: per-user intelligence weighting system

---

Built for doctoral research at the Institute of World Politics, Washington DC.
