# -*- coding: utf-8 -*-
"""
EV Decision Tree Model Training & Serialization Script
Trains a DecisionTreeClassifier on the Electric Vehicle Population Data and saves the
model artifacts along with lookup metadata, performance metrics, and the tree structure JSON.
"""

import os
import datetime
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.dummy import DummyClassifier
import joblib

def export_tree_dict(tree, feature_names, class_names):
    """Recursively exports the decision tree structure into a JSON-serializable dictionary."""
    def recurse(node):
        left = tree.children_left[node]
        right = tree.children_right[node]
        
        # Calculate class probabilities and predicted class for this node
        node_value = tree.value[node][0]
        total_samples = float(np.sum(node_value))
        probabilities = [float(v) / total_samples for v in node_value] if total_samples > 0 else [0.0] * len(node_value)
        predicted_class_idx = int(np.argmax(node_value))
        predicted_class = class_names[predicted_class_idx]
        
        # Leaf node
        if left == -1 and right == -1:
            return {
                "id": int(node),
                "is_leaf": True,
                "class": predicted_class,
                "probabilities": probabilities,
                "samples": int(tree.n_node_samples[node])
            }
        
        # Split node
        feature_idx = tree.feature[node]
        feature_name = feature_names[feature_idx]
        threshold = float(tree.threshold[node])
        
        return {
            "id": int(node),
            "is_leaf": False,
            "feature": feature_name,
            "threshold": threshold,
            "class_predicted": predicted_class,
            "probabilities": probabilities,
            "samples": int(tree.n_node_samples[node]),
            "left": recurse(left),
            "right": recurse(right)
        }
        
    return recurse(0)

def train_and_serialize():
    print("Starting model training pipeline...")
    
    # Locate dataset
    csv_paths = [
        "../dataset/Electric_Vehicle_Population_Data.csv",
        "dataset/Electric_Vehicle_Population_Data.csv",
        "../Electric_Vehicle_Population_Data.csv",
        "Electric_Vehicle_Population_Data.csv"
    ]
    csv_path = None
    for path in csv_paths:
        if os.path.exists(path):
            csv_path = path
            break
            
    if not csv_path:
        raise FileNotFoundError("Could not find Electric_Vehicle_Population_Data.csv. Please place it in the workspace root.")
        
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # 1. Clean and Prepare
    Target = "Electric Vehicle Type"
    Initial_Features = ["Make", "Model", "Model Year", "County"]
    
    # Drop rows missing Target, Make, or Model
    df_clean = df[Initial_Features + [Target]].copy()
    df_clean = df_clean.dropna(subset=[Target, 'Make', 'Model'])
    
    # Fill County with Unknown
    df_clean['County'] = df_clean['County'].fillna('Unknown')
    
    # Fill Model Year with Median
    median_year = df_clean["Model Year"].median()
    df_clean["Model Year"] = df_clean["Model Year"].fillna(median_year)
    
    # 2. Feature Engineering
    current_year = datetime.datetime.now().year
    df_clean["Vehicle Age"] = current_year - df_clean["Model Year"]
    
    # Model frequency count mapping
    model_counts = df_clean["Model"].value_counts().to_dict()
    df_clean["Model_Frequency"] = df_clean["Model"].map(model_counts)
    
    # County grouping into regions
    puget_sound = ["King", "Snohomish", "Pierce", "Kitsap", "Thurston"]
    df_clean["Region"] = df_clean["County"].apply(lambda c: "Puget Sound" if c in puget_sound else "Other WA")
    
    Features = ["Make", "Region", "Vehicle Age", "Model_Frequency"]
    
    # One-hot encode the feature columns
    x = pd.get_dummies(df_clean[Features], columns=["Make", "Region"])
    
    # Encode target labels (BEV/PHEV -> 0/1)
    y_encoder = LabelEncoder()
    y = y_encoder.fit_transform(df_clean[Target])
    
    # Train / Test split
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Training on {len(x_train)} cars, Testing on {len(x_test)} cars.")
    
    # Train Decision Tree
    tree_model = DecisionTreeClassifier(max_depth=4, class_weight='balanced', random_state=42)
    tree_model.fit(x_train, y_train)
    
    # Calculate performance metrics
    train_accuracy = float(tree_model.score(x_train, y_train))
    test_accuracy = float(tree_model.score(x_test, y_test))
    
    # Dummy baseline (most frequent)
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(x_train, y_train)
    baseline_accuracy = float(dummy.score(x_test, y_test))
    
    # Compute test set predictions and confusion matrix
    predictions = tree_model.predict(x_test)
    cm = confusion_matrix(y_test, predictions).tolist()
    
    # Feature Importances
    importances = tree_model.feature_importances_
    feature_columns = x_train.columns.tolist()
    feature_imp = {feat: float(imp) for feat, imp in zip(feature_columns, importances)}
    grouped_importances = {
        "Vehicle Age": feature_imp.get("Vehicle Age", 0.0),
        "Model_Frequency": feature_imp.get("Model_Frequency", 0.0),
        "Make": sum(val for feat, val in feature_imp.items() if feat.startswith("Make_")),
        "Region": sum(val for feat, val in feature_imp.items() if feat.startswith("Region_"))
    }
    
    # Top 10 makes distribution
    top_makes = df_clean["Make"].value_counts().head(10).index.tolist()
    make_dist = []
    for m in top_makes:
        make_df = df_clean[df_clean["Make"] == m]
        bev_c = int(sum(make_df[Target] == y_encoder.classes_[0])) if y_encoder.classes_[0].startswith("Battery") else int(sum(make_df[Target] == y_encoder.classes_[1]))
        phev_c = int(sum(make_df[Target] == y_encoder.classes_[1])) if y_encoder.classes_[0].startswith("Battery") else int(sum(make_df[Target] == y_encoder.classes_[0]))
        make_dist.append({
            "make": m,
            "bev": bev_c,
            "phev": phev_c,
            "total": len(make_df)
        })
        
    # Year distribution (last 15 years)
    years = sorted(df_clean["Model Year"].unique().tolist())
    recent_years = [yr for yr in years if yr >= current_year - 15]
    year_dist = []
    for yr in recent_years:
        yr_df = df_clean[df_clean["Model Year"] == yr]
        bev_c = int(sum(yr_df[Target] == y_encoder.classes_[0])) if y_encoder.classes_[0].startswith("Battery") else int(sum(yr_df[Target] == y_encoder.classes_[1]))
        phev_c = int(sum(yr_df[Target] == y_encoder.classes_[1])) if y_encoder.classes_[0].startswith("Battery") else int(sum(yr_df[Target] == y_encoder.classes_[0]))
        year_dist.append({
            "year": int(yr),
            "bev": bev_c,
            "phev": phev_c
        })
        
    print(f"Model Train Accuracy: {train_accuracy * 100:.2f}%")
    print(f"Model Test Accuracy: {test_accuracy * 100:.2f}%")
    print(f"Baseline Accuracy: {baseline_accuracy * 100:.2f}%")
    
    # Meta lists/mappings for frontend dropdown lookups
    makes = sorted(df_clean["Make"].unique().tolist())
    
    # Group models by make for clean cascading selection
    models_by_make = {}
    for make in makes:
        make_df = df_clean[df_clean["Make"] == make]
        models_by_make[make] = sorted(make_df["Model"].unique().tolist())
        
    counties = sorted(df_clean["County"].unique().tolist())
    
    # Extract decision tree layout
    tree_json = export_tree_dict(tree_model.tree_, x_train.columns.tolist(), y_encoder.classes_.tolist())
    
    # Collect all assets to serialize
    assets = {
        "model": tree_model,
        "feature_columns": x_train.columns.tolist(),
        "model_counts": model_counts,
        "y_classes": y_encoder.classes_.tolist(),
        "makes": makes,
        "models_by_make": models_by_make,
        "counties": counties,
        "tree_json": tree_json,
        "grouped_importances": grouped_importances,
        "make_distribution": make_dist,
        "year_distribution": year_dist,
        "metrics": {
            "train_accuracy": train_accuracy,
            "test_accuracy": test_accuracy,
            "baseline_accuracy": baseline_accuracy,
            "confusion_matrix": cm,
            "total_samples": len(df_clean),
            "bev_count": int(np.sum(y == 0) if y_encoder.classes_[0].startswith("Battery") else np.sum(y == 1)),
            "phev_count": int(np.sum(y == 1) if y_encoder.classes_[0].startswith("Battery") else np.sum(y == 0)),
            "avg_vehicle_age": float(df_clean["Vehicle Age"].mean())
        }
    }
    
    # Save assets to directory
    os.makedirs("model", exist_ok=True)
    output_path = "model/model_assets.joblib"
    joblib.dump(assets, output_path)
    print(f"Successfully serialized model assets to {output_path}")

if __name__ == "__main__":
    train_and_serialize()
