# 🚗 BEVPHEV Prediction System

> **Live Demo:** [bev-phev-prediction-system.vercel.app](https://bev-phev-prediction-system.vercel.app/)

An end-to-end, production-ready hosted service for classifying Electric Vehicles as either a **Battery Electric Vehicle (BEV)** or a **Plug-in Hybrid Electric Vehicle (PHEV)**.

Built with a high-performance **FastAPI** backend hosting a trained **Decision Tree Classifier**, and a premium **React** frontend dashboard featuring BMW-inspired colors, vehicle lookups, KPI metrics, animated Recharts analytics, and an interactive decision path visualization.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Model Architecture](#-model-architecture)
- [API Reference](#-api-reference)
- [Setup & Installation](#-setup--installation)
- [Deployment](#-deployment)

---

## ✨ Features

- 🔍 **Live Vehicle Classification** — Predict BEV vs PHEV from Make, Model, County, and Year
- 🌳 **Interactive Decision Tree** — Visualizes the exact decision path taken for each prediction
- 📊 **KPI Dashboard** — Total vehicles, BEV/PHEV counts, accuracy metrics, and feature importances
- 📈 **Recharts Analytics** — Brand distribution bar charts and year-over-year registration trends
- 🎨 **BMW-Inspired UI** — Premium blue/white/black color palette with Tailwind CSS
- ⚡ **Pre-trained Model** — Model serialized at build time for sub-millisecond prediction latency
- 🐳 **Docker Ready** — Single `docker compose up --build` spins up the full stack

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, Recharts, Framer Motion |
| **Backend** | FastAPI, Uvicorn, scikit-learn, pandas, joblib |
| **ML Model** | Decision Tree Classifier (depth=4, balanced weights) |
| **Containerization** | Docker, Docker Compose, Nginx |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Railway |

---

## 📁 Project Structure

```
BEVPHEV Prediction System/
├── backend/
│   ├── model/                      # Serialized model directory
│   ├── Dockerfile                  # Container definition for FastAPI
│   ├── main.py                     # FastAPI server & prediction routes
│   ├── requirements.txt            # Python dependencies
│   ├── train_model.py              # Script to clean data & train model
│   └── test_backend.py             # Test harness to verify routes locally
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Dashboard with dynamic tree & Recharts
│   │   ├── index.css               # Tailwind + custom utilities
│   │   └── main.jsx                # React entrypoint
│   ├── Dockerfile                  # Stage-1 Node build, Stage-2 Nginx serve
│   ├── nginx.conf                  # Nginx + backend reverse-proxy config
│   ├── tailwind.config.js          # Custom BMW palette configuration
│   └── vite.config.js              # Vite server & proxy mapping
├── docker-compose.yml              # Multi-container orchestration
├── railway.json                    # Railway deployment config
├── .gitignore
├── Electric_Vehicle_Population_Data.csv   # Washington State EV dataset (36MB)
└── README.md
```

---

## 🧠 Model Architecture

To keep predictions fast, the backend avoids reading the raw 36MB CSV at runtime:

1. **Pre-training** — `train_model.py` reads the dataset, cleans it, trains a `DecisionTreeClassifier` (depth=4, balanced class weights), and serializes the model and helper variables into `backend/model/model_assets.joblib`
2. **Metadata extraction** — The training script parses the full decision tree into a JSON structure containing node IDs, splits, sample counts, and class probabilities
3. **Path highlighting** — On each prediction, scikit-learn's `decision_path` returns the list of traversed node IDs, which the frontend highlights in **Active Blue** in the interactive tree diagram

### Model Performance

| Metric | Score |
|---|---|
| Train Accuracy | 76.45% |
| Test Accuracy | 75.82% |
| Baseline Accuracy | 61.20% |

### Top Feature Importances

| Feature | Importance |
|---|---|
| Model Frequency | 48.52% |
| Vehicle Age | 31.20% |
| Make | 14.25% |
| Region | 6.03% |

---

## 📡 API Reference

### `GET /health`
Returns server and model status.
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

### `GET /meta`
Returns training metrics, brand distributions, registrations over time, feature importances, and the full decision tree JSON structure.

```json
{
  "metrics": {
    "train_accuracy": 0.7645,
    "test_accuracy": 0.7582,
    "baseline_accuracy": 0.6120,
    "confusion_matrix": [[22045, 7812], [4210, 15480]],
    "total_samples": 178234,
    "bev_count": 112450,
    "phev_count": 65784,
    "avg_vehicle_age": 4.2
  },
  "makes": ["TESLA", "BMW", "NISSAN"],
  "tree_json": { "id": 0, "is_leaf": false, "feature": "Model_Frequency" },
  "grouped_importances": {
    "Model_Frequency": 0.4852,
    "Vehicle Age": 0.3120
  },
  "make_distribution": [
    { "make": "TESLA", "bev": 72000, "phev": 120, "total": 72120 }
  ],
  "year_distribution": [
    { "year": 2022, "bev": 24500, "phev": 9800 }
  ]
}
```

---

### `POST /predict`
Classifies a vehicle as BEV or PHEV and returns the decision path.

**Request Body:**
```json
{
  "make": "TESLA",
  "model": "MODEL 3",
  "county": "King",
  "model_year": 2022
}
```

**Response:**
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

Interactive Swagger docs available at `/docs` when running locally.

---

## 🚀 Setup & Installation

### Method A — Docker Compose (Recommended)

> Requires Docker Desktop installed and running.

```bash
# 1. Ensure the dataset is present in the root directory
ls Electric_Vehicle_Population_Data.csv

# 2. Build and start both services
docker compose up --build

# 3. Access the application
# Frontend:  http://localhost
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
```

The backend image automatically runs `train_model.py` during the build step, pre-serializing the model inside the container.

---

### Method B — Manual Local Development

**Terminal 1 — Backend:**
```bash
cd backend

# Create and activate virtual environment
py -m venv venv          # Windows
.\venv\Scripts\activate  # Windows
# python3 -m venv venv  # macOS/Linux
# source venv/bin/activate

# Install dependencies and train model
pip install -r requirements.txt
py train_model.py

# Start the API server
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — Vite proxies all `/api/*` requests to the FastAPI backend on port 8000.

---

## ☁️ Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [bev-phev-prediction-system.vercel.app](https://bev-phev-prediction-system.vercel.app/) |
| Backend | Railway | Auto-deployed from `backend/` via `railway.json` |

**Environment variable required on Vercel:**

| Key | Value |
|---|---|
| `VITE_API_URL` | Your Railway backend public URL |

Any push to `main` triggers automatic redeployment on both platforms.

---

## 📊 Dataset

**Washington State Electric Vehicle Population Data**
- Source: [data.wa.gov](https://catalog.data.gov/dataset/electric-vehicle-population-data) — Washington State Dept. of Licensing
- Records: 135,038 vehicle registrations
- Features: 17 columns including Make, Model, County, Model Year, Electric Range, CAFV Eligibility
- Class distribution: BEV 76.9% (103,882) | PHEV 23.1% (31,156)

---

## 👤 Author

**Sabah** — [@esabha-coding](https://github.com/esabha-coding)

  ```https://bev-phev-prediction-system.vercel.app/
