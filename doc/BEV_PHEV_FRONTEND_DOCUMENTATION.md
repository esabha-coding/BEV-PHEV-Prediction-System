# Frontend Documentation

## Overview

The frontend of the **BEV-PHEV Prediction System** is a modern single-page React application built with Vite. It provides a premium analytics dashboard that visualises the complete ML classification pipeline — live BEV vs PHEV predictions, KPI metrics, brand distribution charts, year-over-year registration trends, and an interactive decision tree path visualiser — all wired to the FastAPI backend via Axios.

**Key Frontend Responsibilities**
- **Live Vehicle Classification:** Collects Make, Model, County, and Model Year inputs, posts them to `/predict`, and renders the BEV/PHEV prediction with probability breakdown.
- **Interactive Decision Tree:** Visualises the full trained Decision Tree structure and highlights the exact node path traversed for each prediction in Active Blue.
- **KPI Dashboard:** Displays total vehicles, BEV/PHEV counts, model accuracy metrics, and feature importances as animated metric cards.
- **Recharts Analytics:** Renders brand distribution bar charts and year-over-year EV registration trends using animated Recharts components.
- **Offline Fallback:** If the backend is offline, all charts automatically fall back to realistic mock data so the app remains fully usable as a standalone demo.

---

## Frontend Folder Structure

```
frontend/
├── src/
│   ├── App.jsx             # Dashboard with dynamic tree & Recharts
│   ├── index.css           # Tailwind + custom utilities
│   └── main.jsx            # React entrypoint
├── Dockerfile              # Stage-1 Node build, Stage-2 Nginx serve
├── nginx.conf              # Nginx + backend reverse-proxy config
├── tailwind.config.js      # Custom BMW palette configuration
├── vite.config.js          # Vite server & proxy mapping
└── package.json            # Node dependencies
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18+ | Component-based UI framework |
| Vite | 4+ | Lightning-fast build tool and dev server |
| Tailwind CSS | 3+ | Utility-first styling with custom BMW colour palette |
| Recharts | latest | Brand distribution bar charts and registration trend line charts |
| Framer Motion | latest | Page transitions and chart entrance animations |
| Nginx | latest | Static file serving and backend reverse-proxy (production) |

---

## Dashboard Sections

### Section 1 — KPI Cards

Six animated metric cards rendered at the top of the dashboard:
- Total Vehicles | BEV Count | PHEV Count
- Train Accuracy: 76.45% | Test Accuracy: 75.82% | Baseline Accuracy: 61.20%

### Section 2 — Live Prediction Form

- Four labelled input fields: Make, Model, County, Model Year
- Submits a `POST /predict` request on form submission
- Result card renders: Predicted class (BEV/PHEV), probability breakdown for both classes, and preprocessed input values (Make, Region, Vehicle Age, Model Frequency)
- Decision path node IDs returned by the backend are passed directly to the tree visualiser

### Section 3 — Interactive Decision Tree Visualiser

- Renders the full Decision Tree structure from the `/meta` `tree_json` response
- Each node displays: split feature name, split threshold, sample count, and class probability
- On prediction, the traversed path node IDs are highlighted in Active Blue, showing the exact routing logic for that vehicle
- Tree is scrollable and zoomable for depth-4 readability

### Section 4 — Feature Importance Panel

- Four importance cards sourced from `/meta` `grouped_importances`:
  - Model Frequency: 48.52%
  - Vehicle Age: 31.20%
  - Make: 14.25%
  - Region: 6.03%

### Section 5 — Brand Distribution Chart (Recharts)

- Grouped bar chart: BEV count vs PHEV count per manufacturer
- Data sourced from `/meta` `make_distribution`
- BMW-inspired colour palette: Primary Blue for BEV, Slate for PHEV

### Section 6 — Year-over-Year Registration Trends (Recharts)

- Line chart: BEV registrations vs PHEV registrations by model year
- Data sourced from `/meta` `year_distribution`
- Animated entrance on scroll using Framer Motion

---

## Colour Palette

| Role | Name | Hex |
|---|---|---|
| Primary / BEV | BMW Blue | `#1C69D4` |
| Active Path Highlight | Active Blue | `#0EA5E9` |
| Secondary / PHEV | Slate | `#64748B` |
| Background | Off White | `#F8FAFC` |
| Surface | White | `#FFFFFF` |
| Muted Text | Slate 500 | `#64748B` |
| Dark Text | Gray 900 | `#111827` |
| Success | Emerald | `#059669` |
| Danger | Red | `#DC2626` |

---

## API Integration

All API calls point to the FastAPI backend. The base URL is configured via the `VITE_API_URL` environment variable, falling back to `http://localhost:8000` for local development:

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});
```

### Endpoints Consumed

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Verify server and model status on app load |
| `/meta` | GET | Fetch training metrics, distributions, importances, tree JSON |
| `/predict` | POST | Submit vehicle inputs and receive BEV/PHEV classification |

### Predict Request Payload

```json
{
  "make": "TESLA",
  "model": "MODEL 3",
  "county": "King",
  "model_year": 2022
}
```

### Predict Response Shape

```json
{
  "prediction": "Battery Electric Vehicle (BEV)",
  "probabilities": {
    "Battery Electric Vehicle (BEV)": 0.99,
    "Plug-in Hybrid Electric Vehicle (PHEV)": 0.01
  },
  "decision_path": [0, 2, 6],
  "preprocessed_inputs": {
    "make": "TESLA",
    "region": "Puget Sound",
    "vehicle_age": 4,
    "model_frequency": 5128
  }
}
```

---

## Offline Mock Data Fallback

| Endpoint | Mock Fallback |
|---|---|
| `/meta` | Static dataset stats, hardcoded distributions, placeholder tree JSON |
| `/predict` | Returns `"Battery Electric Vehicle (BEV)"` with 0.90/0.10 probabilities |
| `/health` | Returns `{ status: "offline" }` banner in the UI header |

---

## Vite Proxy Configuration

During local development, Vite proxies all `/api/*` requests to the backend on port 8000, eliminating CORS issues:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

In production (Docker), Nginx handles the reverse-proxy role using `nginx.conf`.

---

## Nginx Configuration (Production)

The production Docker image uses a two-stage build:
1. **Stage 1 (Node):** Runs `npm run build` to produce the static `/dist` bundle
2. **Stage 2 (Nginx):** Serves `/dist` on port 80 and proxies `/api/*` to the FastAPI backend container

---

## Performance Notes

- Vite HMR enables instant browser updates during development
- Recharts components memoized to prevent unnecessary re-renders during input changes
- Framer Motion animations lazy-loaded to avoid blocking initial paint
- Decision tree JSON parsed once from `/meta` and stored in component state; no re-fetch on prediction

---

## Future Frontend Improvements

- **TypeScript Migration:** Convert `App.jsx` to `.tsx` for type safety across prediction response shapes
- **React Query:** Replace raw `useEffect` data fetching with React Query for caching and background refetch
- **Accessibility:** Add ARIA labels to all SVG decision tree nodes for screen reader support
- **Export Reports:** Generate downloadable PDF prediction reports including input values, predicted class, probability breakdown, and highlighted decision path
