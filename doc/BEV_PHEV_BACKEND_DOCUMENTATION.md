# Backend Documentation

## Overview

The backend of the **BEV-PHEV Prediction System** is a lightweight, high-performance microservice built with FastAPI. Its primary objective is to serve real-time BEV vs PHEV vehicle classifications by exposing a pre-trained Decision Tree Classifier through a RESTful API.

**Key Backend Responsibilities**
- **API Engine (FastAPI):** Manages ASGI routing, handles request-response pairing, enforces CORS cross-origin configurations, and runs input validation using Pydantic.
- **Machine Learning Inference:** Receives Make, Model, County, and Model Year inputs, preprocesses them against training-time encodings, runs them through the serialized Decision Tree model, and returns the predicted class with probability scores and decision path node IDs.
- **Metadata Serving:** Exposes full training metrics, brand distributions, year-over-year registration data, feature importances, and the complete serialized tree structure to power the frontend dashboard.
- **Decoupled Frontend Communication:** Accepts standard JSON payloads from the React frontend and outputs standardised HTTP response payloads on port `8000`.

---

## Backend Folder Structure

```
backend/
├── main.py              # FastAPI server: startup, model loading, CORS, endpoints
├── train_model.py       # Run ONCE: cleans data, trains Decision Tree, saves joblib artifacts
├── test_backend.py      # Test harness to verify all routes locally
├── requirements.txt     # Python dependencies
└── model/
    └── model_assets.joblib   # Single serialized artifact containing model + all helper variables
```

**File Purposes**

1. **main.py** — Core operational file. Handles server startup, loads `model_assets.joblib` into memory once, configures CORS middleware, and processes all incoming API requests.
2. **train_model.py** — Data preparation and model training pipeline. Reads the Washington State EV CSV, cleans features, engineers variables, trains the Decision Tree, parses the full tree structure into JSON, and serializes everything into `model_assets.joblib`. Run once before starting the server (automated in Docker build).
3. **test_backend.py** — Local test harness that verifies `/health`, `/meta`, and `/predict` routes return expected shapes before deployment.

---

## Main Components

### main.py

The main program file initiates the REST server and maps all prediction and metadata endpoints:

- **FastAPI Initialization:** Instantiated with custom title and metadata, running on Uvicorn ASGI server.
- **CORS Configuration:** Instantiated with `CORSMiddleware` using wildcard rules (`*`) for local development. Must be restricted to client domain in production.
- **Model Loading:** Resolves the absolute path to `model/model_assets.joblib` and loads the full artifact dictionary into memory at startup using `joblib.load()`. No disk reads occur during request handling.
- **Health Check (`GET /health`):** Reports server status and confirms the model artifact is loaded.
- **Metadata Endpoint (`GET /meta`):** Returns training metrics, make/year distributions, feature importances, and the full `tree_json` structure for the frontend tree visualiser.
- **Prediction Endpoint (`POST /predict`):** Accepts a validated `VehicleInput` Pydantic model, maps Make to training-time encoding, derives Region from County, calculates Vehicle Age from Model Year, looks up Model Frequency from training data, runs `model.predict()` and `model.predict_proba()`, extracts the decision path via `model.decision_path()`, and returns the full prediction response.

### train_model.py

Contains the full data preparation and model serialization pipeline. Runs once during Docker build or manually before first server start:

- **Dataset Loading:** Reads `Electric_Vehicle_Population_Data.csv` (36MB, 135,038 records) using `pd.read_csv()`.
- **Feature Engineering:**
  - `Model_Frequency` — count of each Model string across the full dataset
  - `Vehicle_Age` — derived as `current_year − Model Year`
  - `Region` — County mapped to Washington State regional groupings (e.g., King County → Puget Sound)
  - `Make` — label-encoded to integer using training-time `LabelEncoder`
- **Target Encoding:** `Electric Vehicle Type` mapped to binary: BEV=1, PHEV=0.
- **Train/Test Split:** `train_test_split(test_size=0.2, random_state=42)` producing reproducible splits.
- **Model Training:** `DecisionTreeClassifier(max_depth=4, class_weight='balanced', random_state=42)` fitted on four engineered features.
- **Tree Parsing:** Recursive function walks `clf.tree_` to produce a nested `tree_json` dict containing node IDs, split features, thresholds, sample counts, and class probabilities for each node.
- **Artifact Serialization:** All model objects and helper variables serialized into a single `model_assets.joblib` dict using `joblib.dump()`.

---

## Machine Learning Pipeline

```
Electric_Vehicle_Population_Data.csv (135,038 rows)
    ↓
Feature Engineering
    ├── Model_Frequency (count encoding)
    ├── Vehicle_Age (year subtraction)
    ├── Region (county → region mapping)
    └── Make (label encoding)
    ↓
train_test_split(test_size=0.2, random_state=42)
    ↓ ~108,030 train / ~27,008 test
    ↓
DecisionTreeClassifier(max_depth=4, class_weight='balanced')
    ↓
joblib.dump() → model/model_assets.joblib
```

### Model Performance

| Metric | Score |
|---|---|
| Train Accuracy | 76.45% |
| Test Accuracy | 75.82% |
| Baseline Accuracy | 61.20% |

### Feature Importances

| Feature | Importance |
|---|---|
| Model Frequency | 48.52% |
| Vehicle Age | 31.20% |
| Make | 14.25% |
| Region | 6.03% |

---

## API Reference

### GET /health

Returns server and model load status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

### GET /meta

Returns full dashboard metadata.

**Response:**
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
  "tree_json": { "id": 0, "is_leaf": false, "feature": "Model_Frequency", "threshold": 42.5 },
  "grouped_importances": {
    "Model_Frequency": 0.4852,
    "Vehicle Age": 0.3120,
    "Make": 0.1425,
    "Region": 0.0603
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

### POST /predict

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

---

## Request Lifecycle

```
[ Client sends POST → /predict with Make, Model, County, Model Year ]
    ↓
[ Pydantic VehicleInput validation ] → [ 422 HTTP Error if invalid ]
    ↓ (pass)
[ Feature preprocessing ]
    ├── Make → label encode via training LabelEncoder
    ├── County → Region mapping
    ├── Model Year → Vehicle Age
    └── Model string → Model Frequency lookup
    ↓
[ model.predict() + model.predict_proba() ] → class label + probabilities
    ↓
[ model.decision_path() ] → traversed node ID list
    ↓
[ JSON Response ]
```

---

## Serialized Artifact Contents

`model_assets.joblib` is a single dictionary containing all objects needed at inference time:

| Key | Type | Purpose |
|---|---|---|
| `model` | `DecisionTreeClassifier` | Trained classifier |
| `label_encoder` | `LabelEncoder` | Maps Make strings to integer codes |
| `county_to_region` | `dict` | Maps Washington county names to regional groupings |
| `model_frequency_map` | `dict` | Maps Model strings to training-time frequency counts |
| `tree_json` | `dict` | Full nested tree structure for frontend visualiser |
| `training_year` | `int` | Base year used for Vehicle Age calculation |
| `metrics` | `dict` | Train/test accuracy, confusion matrix, baseline |
| `make_distribution` | `list` | Per-make BEV/PHEV counts for dashboard chart |
| `year_distribution` | `list` | Per-year BEV/PHEV counts for dashboard chart |
| `feature_importances` | `dict` | Named feature importance scores |
| `class_names` | `list` | `["BEV", "PHEV"]` in training label order |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `model_assets.joblib` missing at startup | `FileNotFoundError` raised; server fails fast with descriptive message |
| Invalid/missing request fields | FastAPI Pydantic validation returns `HTTP 422 Unprocessable Entity` with field-level error traces |
| Unknown Make or Model at prediction time | Falls back to median frequency / unknown region; prediction still executes |
| Unhandled inference exception | `HTTP 500 Internal Server Error` returned; full stack trace logged to server stdout |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| fastapi | latest | ASGI framework for REST API routing |
| uvicorn | 0.31.0 | ASGI server to host FastAPI |
| pydantic | latest | Request validation and schema enforcement |
| pandas | latest | Dataset loading and feature engineering |
| numpy | latest | Numeric operations |
| scikit-learn | latest | DecisionTreeClassifier, LabelEncoder, train_test_split |
| joblib | latest | Model serialization and artifact loading |

---

## Docker Build Behaviour

The backend Dockerfile runs `train_model.py` as part of the image build step:

```dockerfile
RUN python train_model.py
```

This means the 36MB CSV is read, the model is trained, and `model_assets.joblib` is written inside the container image at build time. The running container loads only the pre-serialized artifact — no CSV access or training occurs at runtime.

---

## Security Considerations

- **Authentication:** No authentication layer in the current iteration. Configured for local development and Railway deployment only.
- **CORS:** Wildcard `*` origins set for development convenience. Production deployments must restrict this to the Vercel frontend domain explicitly.
- **Future:** Production deployments must add SSL/TLS and JWT token enforcement on prediction endpoints.

---

## Performance Notes

- `model_assets.joblib` is loaded into memory once at server startup — zero disk I/O during request handling.
- Decision Tree inference runs in under 5ms per request.
- `model.decision_path()` is a sparse matrix operation; path extraction adds negligible latency.

---

## Future Backend Improvements

- **JWT Authentication:** Secure `/predict` behind token-based access control.
- **Logging & Monitoring:** Add structured Python logging and Prometheus metrics for inference latency tracking.
- **Model Versioning:** Support multiple serialized model versions with a `/model/version` endpoint for A/B testing.
- **Retraining Pipeline:** Expose a `POST /retrain` endpoint (admin-only) to re-run `train_model.py` on updated Washington State EV data without redeploying.
