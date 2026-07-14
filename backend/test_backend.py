# -*- coding: utf-8 -*-
"""
Test script for the FastAPI backend using TestClient.
Can be executed to verify endpoints, request/response validation, and model loading.
Run using: pip install httpx && python test_backend.py
"""

import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

def run_tests():
    print("=" * 60)
    print("FastAPI Backend Test Suite")
    print("=" * 60)

    # 1. Test GET /
    print("\n[Test 1] Testing Root Endpoint (GET /)")
    try:
        response = client.get("/")
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        if response.status_code == 200:
            print("PASS: Root endpoint works.")
        else:
            print("FAIL: Root endpoint returned error.")
    except Exception as e:
        print(f"FAIL: Root endpoint crashed with error: {e}")

    # Check if model assets are loaded
    assets_loaded = main.assets is not None
    if not assets_loaded:
        print("\nWARNING: model_assets.joblib is not loaded! Some tests will return 503.")
        print("Please train the model first by running: python train_model.py")

    # 2. Test GET /health
    print("\n[Test 2] Testing Health Endpoint (GET /health)")
    try:
        response = client.get("/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        if response.status_code == 200:
            print("PASS: Health check reports healthy.")
        elif response.status_code == 503:
            print("EXPECTED STATUS (Unprepared model): 503 Service Unavailable (Model not trained yet)")
        else:
            print("FAIL: Health check returned unexpected status.")
    except Exception as e:
        print(f"FAIL: Health check crashed: {e}")

    # 3. Test GET /meta
    print("\n[Test 3] Testing Metadata Endpoint (GET /meta)")
    try:
        response = client.get("/meta")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Keys in metadata response:", list(data.keys()))
            print("PASS: Metadata retrieved successfully.")
        elif response.status_code == 503:
            print("EXPECTED STATUS (Unprepared model): 503 (Model not trained yet)")
        else:
            print("FAIL: Metadata returned unexpected status.")
    except Exception as e:
        print(f"FAIL: Metadata endpoint crashed: {e}")

    # 4. Test POST /predict
    print("\n[Test 4] Testing Prediction Endpoint (POST /predict) - Valid Data")
    valid_payload = {
        "make": "TESLA",
        "model": "MODEL 3",
        "county": "King",
        "model_year": 2022
    }
    try:
        response = client.post("/predict", json=valid_payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"Response Body: {response.json()}")
            print("PASS: Prediction processed successfully.")
        elif response.status_code == 503:
            print("EXPECTED STATUS (Unprepared model): 503 (Model not trained yet)")
        else:
            print(f"FAIL: Prediction returned unexpected status. Body: {response.text}")
    except Exception as e:
        print(f"FAIL: Prediction endpoint crashed: {e}")

    # 5. Test POST /predict - Malformed Data
    print("\n[Test 5] Testing Prediction Endpoint (POST /predict) - Malformed Data")
    malformed_payload = {
        "make": 12345,  # Invalid type (integer instead of string)
        "model_year": "invalid-year"  # Invalid type (string instead of integer)
    }
    try:
        response = client.post("/predict", json=malformed_payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        if response.status_code == 422:
            print("PASS: Validation error properly caught by FastAPI (422 Unprocessable Entity).")
        else:
            print("FAIL: Malformed request did not return 422.")
    except Exception as e:
        print(f"FAIL: Malformed prediction check crashed: {e}")

    print("\n" + "=" * 60)
    print("Test Suite Execution Finished")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
