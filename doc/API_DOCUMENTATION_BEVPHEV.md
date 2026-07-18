# API Documentation

## Overview

The BEVPHEV Prediction System exposes a lightweight server-side API where the React frontend communicates with the FastAPI backend through a standardized HTTP REST interface.

When a clinician... — rather, when a user submits vehicle details through the frontend classification form, the client transmits the data as an HTTP POST JSON payload. This payload is sent via a `POST` request to the backend server. The FastAPI server validates the incoming data schema, feeds the parameters into the serialized Decision Tree Classifier, runs the decision path traversal, and returns the BEV/PHEV classification along with the exact decision path as a JSON response.

```
React Frontend                FastAPI Backend
┌──────────────────┐          ┌──────────────────────────────┐
│ 1. Collects Vehicle Inputs │ │ 1. Validates JSON Schema     │
│ 2. Serializes to JSON      │─▶ 2. Runs decision_path()      │
│ 7. Renders decision tree   │◀│ 4. Runs Model Inference       │
│ 8. Highlights Active Path  │ │ 5. Returns JSON prediction    │
└──────────────────┘          └──────────────────────────────┘
```

---

## Base URL

By default, the backend API server is hosted locally at:

```
http://127.0.0.1:8000
```

For production deployments, this Base URL is updated dynamically via the `VITE_API_URL` environment variable set on Vercel, which holds the Railway backend URL.

---

## Authentication

Authentication is currently **not implemented** for local development. The API allows cross-origin requests from the React client via CORS middleware without authentication headers.

---

## Endpoints

### GET /health

**Purpose**
Verifies the current status of the backend FastAPI service and ensures that the serialized Decision Tree classification model (`model_assets.joblib`) has loaded successfully at startup.

**Request**
- Method: `GET`
- Path: `/health`
- Headers: None required
- Query Parameters: None
- Request Body: None

**Success Response**
- HTTP Status Code: `200 OK`
- Content-Type: `application/json`
- JSON Fields:
  - `status` (string): Current server status flag (`"healthy"`)
  - `model_loaded` (boolean): True if the classifier model file loaded successfully

**Example JSON**

```json
{
  "status": "healthy",
  "model_loaded": true
}
```

**Possible Error Response**
- HTTP Status Code: `500 Internal Server Error` — occurs if the `model_assets.joblib` file fails to load at startup.

---

### GET /meta

**Purpose**
Returns training metrics, brand distributions, registrations over time, Gini feature importances, and the JSON-serializable decision tree split structure. Used to populate KPI cards, charts, and the interactive decision tree diagram.

**Success Response**

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
  "models_by_make": {
    "TESLA": ["MODEL 3", "MODEL Y"]
  },
  "counties": ["King", "Snohomish"],
  "tree_json": { "id": 0, "is_leaf": false, "feature": "Model_Frequency" },
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

**UI Translation Mapping**
- `metrics.test_accuracy` displayed as the model confidence badge (75.82%)
- `grouped_importances` powers the feature importance bar chart
- `make_distribution` powers the brand distribution stacked bar chart
- `year_distribution` powers the registrations-over-time line chart
- `tree_json` renders the full interactive decision tree diagram

---

### POST /predict

**Purpose**
Calculates the vehicle classification outcome (BEV or PHEV) by evaluating Make, Model, County, and Model Year against the trained Decision Tree Classifier.

**Request Headers**
- Content-Type: `application/json`

**Request Body (JSON)**

| Parameter | Type | Required | Description | Example Value |
|---|---|---|---|---|
| make | String | Yes | Vehicle manufacturer | `"TESLA"` |
| model | String | Yes | Vehicle model name | `"MODEL 3"` |
| county | String | Yes | Washington State county of registration | `"King"` |
| model_year | Integer | Yes | Vehicle model year | `2022` |

**Example Request Payload**

```json
{
  "make": "TESLA",
  "model": "MODEL 3",
  "county": "King",
  "model_year": 2022
}
```

**Success Response**
- HTTP Status Code: `200 OK`
- Content-Type: `application/json`

**Response Fields**

| Parameter | Type | Description |
|---|---|---|
| prediction | String | Human-readable classification label (`"Battery Electric Vehicle (BEV)"` or `"Plug-in Hybrid Electric Vehicle (PHEV)"`) |
| probabilities | Object | Class probability breakdown for both BEV and PHEV |
| decision_path | Array[Integer] | Ordered list of decision tree node IDs traversed for this prediction |
| preprocessed_inputs | Object | The engineered feature values actually fed into the model (region, vehicle_age, model_frequency) |

**Success Response Example JSON**

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

**UI Translation Notes**
- `decision_path`: Node IDs are mapped onto the frontend's rendered decision tree diagram and highlighted in **Active Blue**
- `probabilities`: Displayed as a confidence percentage bar under the prediction result card
- `preprocessed_inputs.vehicle_age`: Shown as an info tooltip explaining how model_year was converted internally

**Validation Errors**

FastAPI automatically parses the input payload against the defined Pydantic request model. If any variable is missing, of the wrong data type (e.g. passing a string for `model_year`), or formatted incorrectly, the server rejects the request.

- HTTP Status Code: `422 Unprocessable Entity`
- Content-Type: `application/json`

**Validation Error Example JSON**

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "make"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

**Internal Server Error**

If an unhandled exception or model loading failure occurs on the server:
- HTTP Status Code: `500 Internal Server Error`

**Internal Server Error Example JSON**

```json
{
  "detail": "Internal server error occurred during prediction."
}
```

---

## Response Status Codes

| Status Code | Message | Description |
|---|---|---|
| 200 | OK | Request completed successfully. Response payload contains results. |
| 422 | Unprocessable Entity | Request parameters are malformed or invalid. |
| 500 | Internal Server Error | Backend server exception or model file loading error. |

---

## Backend Workflow

The following flowchart describes the operational prediction lifecycle:

```
[ React Frontend ]
       │ (serializes camelCase to PascalCase)
   POST /predict Payload
       │
       ▼
[ FastAPI App ]
       │ [ Input Validation ] ──(Fail)──▶ [ Return HTTP 422 (Error Details) ]
       │ (Pass)
       ▼
[ Feature Engineering ] ──▶ (Preserves training column order)
       │
       ▼
[ Model Inference + decision_path() ]
       │
       ▼
[ Map Prediction Label ] ──▶ (1 → "BEV" | 0 → "PHEV")
       │
       ▼
[ JSON HTTP Response ] ──▶ [ React Client UI Render & Decision Tree Highlight ]
```

---

## Testing

### A. Testing with cURL

Run the following cURL command from your terminal to verify prediction routing:

```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "TESLA",
    "model": "MODEL 3",
    "county": "King",
    "model_year": 2022
  }'
```

### B. Testing with Postman

1. Open **Postman** and create a new request tab.
2. Select **POST** as the HTTP Method.
3. Enter the request URL:
   ```
   http://127.0.0.1:8000/predict
   ```
4. Click on the **Headers** tab and add:
   - Key: `Content-Type`
   - Value: `application/json`
5. Click on the **Body** tab, select **raw**, and set the type dropdown to **JSON**.
6. Paste the following payload inside the editor:
   ```json
   {
     "make": "NISSAN",
     "model": "LEAF",
     "county": "Snohomish",
     "model_year": 2019
   }
   ```
7. Click **Send**. The response panel will display the status code `200 OK`, and the result payload.

---

## Notes

- **Environment:** This API is currently intended for local development, clinical decision support simulations, and educational purposes.
- **CORS Configuration:** CORS permissions are set to wildcard (`*`) for local dev convenience. This should be restricted to the client's production domain when deploying.
- **Model Re-training:** To update model parameters, run the backend `train_model.py` script. The API server will reload the saved `.joblib` model binary automatically on next startup.
- **No Retraining on Startup:** The FastAPI server never retrains the model — it only loads the pre-serialized `model_assets.joblib` file created during the build step.
