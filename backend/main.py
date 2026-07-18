# -*- coding: utf-8 -*-
"""
FastAPI Backend API for EV Decision Tree Predictor
Exposes endpoints for prediction, model metadata, and decision tree details.
"""

import os
import datetime
from typing import Optional, Dict, List, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib

app = FastAPI(
    title="BEVPHEV Prediction API",
    description="FastAPI service serving the Decision Tree Classifier for EV classification.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://bev-phev-prediction-system.vercel.app"
    ],
    allow_origin_regex=r"https://bev-phev-prediction-system.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load serialized model assets
assets_path = os.path.join(os.path.dirname(__file__), "model", "model_assets.joblib")
assets = None

if os.path.exists(assets_path):
    try:
        assets = joblib.load(assets_path)
        print("Model assets loaded successfully.")
    except Exception as e:
        print(f"Error loading model assets: {e}")
else:
    print(f"WARNING: Model assets not found at {assets_path}. Run train_model.py first!")

class PredictRequest(BaseModel):
    # Support high-level user parameters
    make: str = Field(..., example="TESLA")
    model: Optional[str] = Field(None, example="MODEL 3")
    county: Optional[str] = Field(None, example="King")
    model_year: Optional[int] = Field(None, example=2022)
    
    # Or direct low-level model parameters
    region: Optional[str] = Field(None, example="Puget Sound")
    vehicle_age: Optional[int] = Field(None, example=4)
    model_frequency: Optional[int] = Field(None, example=5000)

class PredictResponse(BaseModel):
    prediction: str
    probabilities: Dict[str, float]
    decision_path: List[int]
    preprocessed_inputs: Dict[str, Any]

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "BEVPHEV Prediction Backend is running.",
        "assets_loaded": assets is not None
    }

@app.get("/health")
def health_check():
    if assets is None:
        raise HTTPException(
            status_code=503, 
            detail="Model assets are not loaded. Please run the training script."
        )
    return {"status": "healthy", "model_loaded": True}

@app.get("/meta")
def get_meta():
    if assets is None:
        raise HTTPException(
            status_code=503, 
            detail="Model assets are not loaded. Please run the training script."
        )
    
    return {
        "metrics": assets["metrics"],
        "makes": assets["makes"],
        "models_by_make": assets["models_by_make"],
        "counties": assets["counties"],
        "tree_json": assets["tree_json"],
        "grouped_importances": assets.get("grouped_importances", {}),
        "make_distribution": assets.get("make_distribution", []),
        "year_distribution": assets.get("year_distribution", [])
    }

@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if assets is None:
        raise HTTPException(
            status_code=503, 
            detail="Model assets are not loaded. Please run the training script."
        )
        
    model = assets["model"]
    feature_columns = assets["feature_columns"]
    model_counts = assets["model_counts"]
    y_classes = assets["y_classes"]
    
    # Resolve Make (case-insensitive conversion to match training data)
    req_make = payload.make.strip().upper()
    
    # Check if Make is valid (fallback to uppercase version)
    matched_make = next((m for m in assets["makes"] if m.upper() == req_make), None)
    if not matched_make:
        # If make not found, we use the raw requested make (it will result in all make dummy columns being 0)
        matched_make = req_make
        
    # Determine Region
    req_region = None
    if payload.county:
        puget_sound = ["King", "Snohomish", "Pierce", "Kitsap", "Thurston"]
        req_county = payload.county.strip().title()
        req_region = "Puget Sound" if req_county in puget_sound else "Other WA"
    else:
        req_region = payload.region or "Other WA"
        
    # Determine Vehicle Age
    req_age = None
    if payload.model_year is not None:
        current_year = datetime.datetime.now().year
        req_age = max(0, current_year - payload.model_year)
    else:
        req_age = payload.vehicle_age if payload.vehicle_age is not None else 5
        
    # Determine Model Frequency
    req_freq = None
    if payload.model:
        req_model = payload.model.strip().upper()
        # Find model count case-insensitively
        matched_count = 1
        for m_name, count in model_counts.items():
            if m_name.upper() == req_model:
                matched_count = count
                break
        req_freq = matched_count
    else:
        req_freq = payload.model_frequency if payload.model_frequency is not None else 1
        
    # Create prediction dataframe aligned with training feature columns
    input_data = pd.DataFrame(0, index=[0], columns=feature_columns)
    
    # Fill numerical columns
    input_data["Vehicle Age"] = req_age
    input_data["Model_Frequency"] = req_freq
    
    # Set one-hot columns to 1 if they exist
    make_col = f"Make_{matched_make}"
    region_col = f"Region_{req_region}"
    
    if make_col in input_data.columns:
        input_data[make_col] = 1
    if region_col in input_data.columns:
        input_data[region_col] = 1
        
    # Perform prediction
    try:
        pred_idx = int(model.predict(input_data)[0])
        pred_label = y_classes[pred_idx]
        
        # Calculate class probabilities
        probs_array = model.predict_proba(input_data)[0]
        probabilities = {y_classes[i]: float(p) for i, p in enumerate(probs_array)}
        
        # Tracing decision path nodes
        dec_path = model.decision_path(input_data)
        path_nodes = dec_path.indices.tolist()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
        
    return PredictResponse(
        prediction=pred_label,
        probabilities=probabilities,
        decision_path=path_nodes,
        preprocessed_inputs={
            "make": matched_make,
            "region": req_region,
            "vehicle_age": req_age,
            "model_frequency": req_freq
        }
    )
