# Project Architecture

## Overview

The **BEVPHEV Prediction System** is a lightweight, decoupled web platform designed to classify Electric Vehicles as either Battery Electric Vehicles (BEV) or Plug-in Hybrid Electric Vehicles (PHEV) based on registration data. The application follows a classic client-server architecture:

- **Frontend SPA:** A single-page React app bundled with Vite and styled via Tailwind CSS v4. It manages local UI state, renders interactive charts and the decision tree diagram, and dynamically routes pages using in-browser navigation.
- **Backend API:** An asynchronous FastAPI service that exposes a serialized machine learning model through a RESTful interface.
- **Machine Learning Engine:** A classification pipeline powered by a scikit-learn `DecisionTreeClassifier` (depth=4, balanced weights), pre-trained on the Washington State Electric Vehicle Population dataset (135,038 records).

These components coordinate through a stateless JSON-over-HTTP RESTful interface, keeping data operations fast, lightweight, and simple.

---

## High-Level Architecture

The operational workflow and communication boundaries between system elements are structured as follows:

```
[ User (Analyst / Researcher) ]
         │ (Vehicle parameters: Make, Model, County, Year)
         ▼
┌─────────────────────────────────────────────┐
│              React Frontend                 │
│  [ Vehicle Input Form ] → [ Client-side check ] → (Passes)
│  [ Result Panel ] ← [ API fetch client dispatch ]
│  [ Interactive Decision Tree Diagram ]
└───────────────────┬─────────────────────────┘
                     │ (POST /predict JSON)
                     ▼
┌─────────────────────────────────────────────┐
│              FastAPI Backend                │
│  [ Pydantic Schema Validation ]              │
│  [ Feature Engineering (region, vehicle_age, │
│     model_frequency) ]                       │
│  [ Decision Tree Inference + decision_path()]│
│  [ JSON response mapping ]                   │
└───────────────────┬─────────────────────────┘
                     │ (Returns JSON response)
                     ▼
        [ React Client renders classification
           result & highlights decision path ]
```

---

## System Components

### 1. Frontend SPA

- **Responsibility:** Manages form input, client-side validation, chart rendering, responsive design transitions, connection status indicators, and rendering the interactive decision tree.
- **Key Modules:** React core (`App.jsx`), custom API service client (`predictionService.js`), Recharts components for KPI/brand/year charts, decision tree renderer with Active Blue path highlighting.

### 2. Backend API

- **Responsibility:** Manages ASGI routing, handles API request payloads, validates input data formats, handles runtime exceptions, and routes parameters to the model.
- **Key Modules:** FastAPI router, Pydantic request/response schemas, CORS middleware configuration, Uvicorn ASGI server process.

### 3. Machine Learning Engine

- **Responsibility:** Processes vehicle feature variables, converts categorical inputs into engineered features (region mapping, vehicle age, model frequency encoding), performs predictive classification, and returns the decision path.
- **Key Modules:** scikit-learn `DecisionTreeClassifier`, joblib serialization/deserialization helpers, decision tree JSON structure parser.

---

## Project Directory Structure

```
BEVPHEV Prediction System/
├── backend/                     # FastAPI Python backend app
│   ├── model/                   # Serialized model directory (model_assets.joblib)
│   ├── Dockerfile               # Container definition for FastAPI
│   ├── main.py                  # FastAPI server & prediction routes
│   ├── requirements.txt         # Python dependencies manifest
│   ├── train_model.py           # Cleans data, trains DecisionTreeClassifier
│   └── test_backend.py          # Test harness to verify routes locally
├── frontend/                    # React + Vite + Tailwind CSS v4 Frontend App
│   ├── src/
│   │   ├── App.jsx              # Dashboard with dynamic tree & Recharts
│   │   ├── index.css            # Tailwind + custom utilities
│   │   └── main.jsx             # React entrypoint
│   ├── Dockerfile               # Stage-1 build Node, Stage-2 serve Nginx
│   ├── nginx.conf               # Nginx + backend reverse-proxy config
│   ├── tailwind.config.js       # Custom BMW-inspired palette config
│   └── vite.config.js           # Vite server & proxy mapping
├── docker-compose.yml           # Multi-container orchestration
├── railway.json                 # Railway deployment configuration
├── .gitignore
├── Electric_Vehicle_Population_Data.csv  # Washington State EV dataset (36MB)
└── README.md                    # Setup & deployment manual
```

---

## Data Flow

The lifecycle of an evaluation data transaction traverses the following stages:

```
[ 1. User Entry ] → User enters vehicle parameters in React UI
       │
[ 2. Form Submit ] → Client validates inputs; fires predictionService dispatch
       │
[ 3. HTTP Request ] → POST request dispatched to http://127.0.0.1:8000/predict
       │
[ 4. Schema Audit ] → Pydantic checks request parameters against schema rules
       │
[ 5. Feature Engineering ] → Make/Model/County/Year converted into
       │                     region, vehicle_age, model_frequency features
       │
[ 6. Inference ] → DecisionTreeClassifier.predict() + decision_path() called
       │
[ 7. HTTP Response ] → Returns JSON outcome
       │                {"prediction": "BEV"/"PHEV", "decision_path": [...]}
       │
[ 8. UI Mapping ] → React maps prediction status to result card and
                     highlights the traversed path in the tree diagram
```

---

## Frontend Architecture

- **Pages:** Views are modularized into independent functional sections:
  - **Dashboard:** Aggregates KPI metrics, brand distribution charts, and recent classification history.
  - **Predict:** Displays the vehicle intake form and real-time classification result.
  - **Visualizations:** Interactive decision tree diagram with path highlighting.
- **Components:** Separated into generic atomic UI elements (buttons, cards, inputs) and layout wrapper components (Header, Footer, MainLayout).
- **Services:** Network calls are decoupled into `api.js` (fetch/axios wrapper) and `predictionService.js` (predict requests).
- **Routing:** Lightweight custom-state route controller using `currentRoute` and `onNavigate` callbacks.
- **State Flow:** Unidirectional React props mapping, utilizing local hooks to bind DOM events.

---

## Backend Architecture

- **FastAPI:** Main application instance manages ASGI request routing and CORS configuration.
- **Endpoints:**
  - `GET /health`: Diagnostic API heartbeat check.
  - `GET /meta`: Returns training metrics, brand/year distributions, and decision tree JSON structure.
  - `POST /predict`: Handles patient parameter evaluation requests.
- **Model Loading:** Absolute path resolution loads `model_assets.joblib` once at startup using `joblib.load`.
- **Prediction Flow:** Translates JSON body into a Pandas DataFrame to preserve training feature order, passes the dataframe into the model, and returns predicted classes with the decision path.
- **Error Handling:** Implements validation catches (HTTP 422 for bad schema bodies) and server exceptions (HTTP 500 for runtime or file loading errors).

---

## Machine Learning Pipeline

The backend implements a classic batch-offline ML pipeline:

```
[ Washington EV Population CSV (dataset/) ]
       │
[ Preprocessing (train_model.py) ] ──▶ Nulls check, drops incomplete rows,
       │                               splits train/test
       ▼
[ Fit Training (DecisionTreeClassifier, depth=4, balanced weights) ]
       │
       ▼
[ Model Persistence (models/) ] ──▶ joblib.dump(model_assets.joblib)
       │
       ▼
[ Live Inference API (main.py) ] ──▶ joblib.load & model.predict + decision_path
```

---

## Communication Flow

The frontend client communicates with the backend API via stateless HTTP REST requests:

1. **Request Header:** The frontend sends headers defining `Content-Type: application/json`.
2. **Request Body:** Sends a JSON object with make/model/county/model_year fields mapping to the Pydantic schema model.
3. **Response Body:** The backend outputs standard JSON parameters (`prediction`, `probabilities`, `decision_path`) and status code `200 OK`.
4. **CORS Headers:** The backend sends origin clearance tags to bypass browser boundary blocks.

---

## Error Handling Architecture

- **Frontend Validation:** Captures missing variables, incorrect vehicle year formats, and range discrepancies locally before sending requests, reducing invalid network load.
- **Backend Validation:** Pydantic schemas catch bad payload bodies and return standard `HTTP 422 Unprocessable Entity` validation responses.
- **API Errors:** If connection drops or API requests fail, the client catches and displays a descriptive alert box in the UI.
- **Prediction Errors:** Boundary validation handles model failures and outputs structured error responses.

---

## Performance Considerations

- **Model Loaded Once:** Loading the model object into memory once during Uvicorn server startup ensures subsequent API prediction requests reduce latency under 5ms.
- **Fast API Response:** Decoupled, stateless Uvicorn readiness maximizes API throughput.
- **Frontend Efficiency:** Vite production build minifies chunks, removing development logs and unused files for optimal loading performance.

---

## Security Considerations

- **Cross-Origin Resource Sharing (CORS):** Configured to allow all origins (`*`) for local development, which must be restricted to standard client domain paths for production.
- **Authentication:** Local development versions bypass authorization rules. Production versions must run behind JWT access controllers.
- **Input Sanitization:** Pydantic and React form validation sanitize values to prevent injection issues.

---

## Scalability

To transition the project from local prototyping to institutional enterprise scale:

- **Authentication:** Integrate secure login interfaces (such as Auth0 or OAuth2) to protect endpoint access.
- **Databases:** Replace static CSV-driven pipelines with PostgreSQL or MongoDB instances for persistent audit trails.
- **Cloud Deployment:** Set up pipelines to deploy FastAPI to cloud container services (Railway, Render, Google Cloud Run) with auto-scaling rules.
- **Dockerization:** Dockerfile images for backend and frontend already exist, enabling `docker compose up --build` deployment consistency.
- **CI/CD:** Configure GitHub Actions to test, build, and deploy changes automatically.
- **Monitoring:** Add monitoring hooks to track request traffic and monitor prediction models.

---

## Future Architecture (Version 2)

```
[ React Frontend Client ]
         │ (HTTPS, JWT Auth)
         ▼
[ NGINX Reverse Proxy ]
         │
         ▼
[ FastAPI Web Cluster ]
         │
   ┌─────┴─────┐
   │ (Cache) → Redis Cache
   ▼
[ PostgreSQL Database ]
```

The next architectural iteration (Version 2) will implement:

- **PostgreSQL Database:** Relational storage to catalog vehicle records, classification actions, and diagnostic metrics securely.
- **JWT Authentication:** Enforces secure login requests to reduce ML model processing overhead exposure.
- **Redis Cache:** Caches recent classification requests to reduce cluster scaling and high availability load.
- **Docker & Kubernetes:** Containerizes app services to manage cluster container problems and scale on demand.
- **Cloud Hosting:** Deploys backend API layers on scalable container platforms.

---

## Conclusion

The BEVPHEV Prediction System implements a lightweight, decoupled system architecture. By separating the React frontend from the FastAPI backend and incorporating a serialized scikit-learn Decision Tree Classifier, the platform ensures rapid local responses, simple database configurations, and highly modular code maintenance.
