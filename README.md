# BEVPHEV Prediction System — Hosted Service

An end-to-end, production-ready, hosted service for classifying Electric Vehicles as either a **Battery Electric Vehicle (BEV)** or a **Plug-in Hybrid Electric Vehicle (PHEV)**. It consists of a high-performance **FastAPI backend** that hosts a trained Decision Tree Classifier, and a premium **React frontend dashboard** featuring BMW-inspired colors, vehicle lookups, KPI metrics, animated Recharts analytics, and an interactive decision path visualization.

---

## Workspace Structure

```bash
BEVPHEV Prediction System/
├── backend/
│   ├── model/                      # Serialized model directory
│   ├── Dockerfile                  # Container definition for FastAPI
│   ├── main.py                     # FastAPI server & prediction routes
│   ├── requirements.txt            # Python dependencies
│   ├── train_model.py              # Script to clean data and train scikit-learn model
│   └── test_backend.py             # Test harness to verify routes locally
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Dashboard React component with dynamic tree rendering & Recharts
│   │   ├── index.css               # Stylesheet (Tailwind, Inter font, custom utilities)
│   │   └── main.jsx                # React Entrypoint
│   ├── Dockerfile                  # Stage-1 build Node, Stage-2 serve Nginx
│   ├── index.html                  # Core HTML structure & font loading
│   ├── nginx.conf                  # Nginx server & backend reverse-proxy routing
│   ├── postcss.config.js           # PostCSS configuration
│   ├── tailwind.config.js          # Tailwind custom palette configuration
│   └── vite.config.js              # Vite server & proxy mapping
├── docker-compose.yml              # Multi-container orchestration
├── .gitignore                      # Git configuration to exclude temporary build & env folders
├── Electric_Vehicle_Population_Data.csv # Main vehicle dataset (36MB)
├── ev_decision_tree_model (1).py   # Original research script
└── README.md                       # Setup & deployment manual
```

---

## Feature Engineering & Model Pre-training

To make predictions extremely fast and responsive, the FastAPI backend avoids reading the raw 36MB dataset at startup or during prediction requests. Instead:
1. **Pre-training:** Running `backend/train_model.py` reads `Electric_Vehicle_Population_Data.csv`, cleans the data, trains the `DecisionTreeClassifier` (depth=4, balanced weights), and serializes the model and helper variables into `backend/model/model_assets.joblib`.
2. **Metadata extraction:** The training script automatically parses the decision tree structure into a JSON representation containing node IDs, splits (features and thresholds), sample counts, and class probabilities.
3. **Traversed Path Highlighting:** When a prediction is requested, scikit-learn's `decision_path` method is run for the input. The list of traversed node IDs is returned. The frontend dashboard then highlights this path in **Active Blue** inside the interactive decision tree diagram.

---

## Deployment & Setup Instructions

### Method A: Running with Docker Compose

If Docker Desktop is installed, you can launch both services together:

1. **Verify files:** Make sure `Electric_Vehicle_Population_Data.csv` is present in the root directory.
2. **Build and start services:**
   ```bash
   docker compose up --build
   ```
   *Note: The backend image will automatically run the training script during the build step, pre-serializing the model inside the container.*
3. **Access the application:**
   - **Frontend Dashboard:** [http://localhost](http://localhost) (Port 80)
   - **Backend API:** [http://localhost:8000](http://localhost:8000) (Interactive Swagger docs available at [http://localhost:8000/docs](http://localhost:8000/docs))

---

### Method B: Manual Local Development (Recommended if Docker is missing)

#### 1. Setup Backend
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On Windows:
   py -m venv venv
   .\venv\Scripts\activate
   
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Train the model and serialize assets:
   ```bash
   # On Windows:
   py train_model.py
   
   # On macOS/Linux:
   python3 train_model.py
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

#### 2. Setup Frontend
1. Open a **second terminal** and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to [http://localhost:5173](http://localhost:5173). Vite will proxy all `/api/*` requests to the FastAPI backend running on port 8000.

---

## API Documentation

### 1. Health Check
- **Endpoint:** `GET /health`
- **Response:**
  ```json
  {
    "status": "healthy",
    "model_loaded": true
  }
  ```

### 2. Model Metadata
- **Endpoint:** `GET /meta`
- **Description:** Returns training metrics (including the confusion matrix), brand distributions, registrations over time, Gini feature importances, and the JSON-serializable decision tree split structure.
- **Response Shape:**
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
    "makes": [ "TESLA", "BMW", "NISSAN", ... ],
    "models_by_make": {
      "TESLA": [ "MODEL 3", "MODEL Y", ... ]
    },
    "counties": [ "King", "Snohomish", ... ],
    "tree_json": { "id": 0, "is_leaf": false, "feature": "Model_Frequency", ... },
    "grouped_importances": {
      "Model_Frequency": 0.4852,
      "Vehicle Age": 0.3120,
      "Make": 0.1425,
      "Region": 0.0603
    },
    "make_distribution": [
      { "make": "TESLA", "bev": 72000, "phev": 120, "total": 72120 },
      ...
    ],
    "year_distribution": [
      { "year": 2022, "bev": 24500, "phev": 9800 },
      ...
    ]
  }
  ```

### 3. Prediction API
- **Endpoint:** `POST /predict`
- **Request Body (JSON):**
  ```json
  {
    "make": "TESLA",
    "model": "MODEL 3",
    "county": "King",
    "model_year": 2022
  }
  ```
- **Response Shape:**
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
