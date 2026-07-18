# User Guide

## Introduction

Welcome to the **BEVPHEV Prediction System User Guide**. This platform is a machine learning-powered analytics dashboard designed to classify Electric Vehicles as either a **Battery Electric Vehicle (BEV)** or a **Plug-in Hybrid Electric Vehicle (PHEV)** using registration data indicators.

### Target Audience

This application is designed for **data analysts, EV market researchers, and automotive industry professionals** seeking a rapid classification tool to understand BEV/PHEV distribution patterns across Washington State.

### Diagnostic Workflow

```
[ Open Portal ] → [ Enter Vehicle Parameters ] → [ Evaluate Classification ]
                                                          │
[ Review Decision Tree Path ] ← [ Explore Analytics ] ← [ Map Feature Importances ]
```

---

## Application Overview

The platform is designed as a single-page SaaS dashboard divided into three main workspaces:

1. **Dashboard:** The central hub, aggregating live classification stats, brand distribution charts, and recent evaluation results.
2. **Predict:** The classification portal featuring standard vehicle input fields and a real-time BEV/PHEV estimation panel.
3. **Visualizations:** An interactive decision tree diagram highlighting exactly how the model reached its classification for each prediction.

---

## Dashboard

Upon launching the application, you are presented with the central **Analytics Dashboard**:

- **KPI Cards:** Panels displaying:
  - Total Predictions: Total vehicle classifications run on this system
  - BEV Predictions: Number of vehicles classified as Battery Electric
  - PHEV Predictions: Number of vehicles classified as Plug-in Hybrid
  - Model Accuracy: Test accuracy of the underlying classifier (75.82%)
- **Brand Distribution Chart:** Stacked bar chart showing BEV vs PHEV counts per manufacturer.
- **Registrations Over Time Chart:** Line chart showing year-over-year BEV/PHEV registration trends.
- **Feature Importance Chart:** Bar chart ranking which inputs most influence classification (Model Frequency: 48.52%, Vehicle Age: 31.20%, Make: 14.25%, Region: 6.03%).
- **Quick Actions:** Navigation shortcuts to launch new classifications or explore visualizations.

---

## Predict Page

The Predict page houses the vehicle parameter entry form and the real-time AI classification panel.

### Performing a Classification

Enter the vehicle's details into the form fields:

1. **Make:** Vehicle manufacturer (e.g. TESLA, NISSAN, BMW, CHEVROLET).
   - Selected from a dropdown populated by the dataset's known manufacturers.
2. **Model:** Vehicle model name (e.g. MODEL 3, LEAF, BOLT EV).
   - Dropdown dynamically filters based on the selected Make.
3. **County:** Washington State county of vehicle registration (e.g. King, Snohomish, Pierce).
4. **Model Year:** The vehicle's model year.
   - Validation: Integer value, reasonable range (e.g. 2010–2026).

### Form Submission

Click the **Classify Vehicle** button. If any field fails validation (e.g. leaving a field empty or selecting an invalid combination), the system displays red error badges under the corresponding fields and blocks submission.

### Loading State

Upon successful submission, the system displays a brief **Evaluating Vehicle Data** status overlay. The backend API processes inputs in under 5ms once the model is loaded, yielding near-instant results.

---

## Understanding the AI Classification Result Card

Once classification completes, a result card mounts displaying:

- **Prediction Result:** A colored badge indicating the classification outcome:
  - `BEV` (Blue): Battery Electric Vehicle
  - `PHEV` (Amber): Plug-in Hybrid Electric Vehicle
- **Confidence Score:** Displayed as a percentage bar reflecting the model's probability estimate for the predicted class (e.g. 99% confidence for BEV).
- **Decision Path Highlight:** The interactive decision tree diagram automatically highlights the exact sequence of nodes traversed to reach this classification in **Active Blue**.
- **Preprocessed Inputs:** Shows the engineered features actually used by the model — region mapping, calculated vehicle age, and model frequency encoding.

---

## Visualizations Page

The **Visualizations** workspace displays the full interactive decision tree used by the classifier:

- **Decision Tree Diagram:** A rendered node-and-branch diagram of the trained `DecisionTreeClassifier` (depth=4).
- **Node Details:** Hovering over any node reveals the split feature, threshold value, sample count, and class probability distribution at that node.
- **Active Path Highlighting:** After a prediction, the specific path taken through the tree is highlighted in blue, letting users trace exactly why a vehicle was classified as BEV or PHEV.
- **Feature Importance Panel:** A supporting bar chart ranking Gini-based feature importances across the whole tree.

---

## Quick Actions

Dashboard quick action buttons help streamline user workflows:

1. **New Prediction:** Routes you to the Predict page intake form.
2. **View Visualizations:** Routes you to the interactive decision tree workspace.
3. **Refresh Dashboard:** Reloads the latest metadata and chart data from the backend.

---

## Understanding Classification Results

The system categorizes vehicle classifications as follows:

| Classification | Mapped Indicator | Confidence Range | Interpretation |
|---|---|---|---|
| `BEV` | Blue Badge | Typically 85–99% | High confidence the vehicle is fully electric based on model frequency and vehicle age patterns |
| `PHEV` | Amber Badge | Typically 70–95% | Vehicle patterns match plug-in hybrid registration characteristics |

> ⚠️ **Disclaimer:** This system uses a machine learning classifier trained on historical Washington State registration data and is designed for educational and analytical purposes only. It does not replace manufacturer specifications or official vehicle documentation.

---

## Common Errors

| Error Symptom | Possible Cause | Recommended Resolution |
|---|---|---|
| "Failed to connect to API" | The FastAPI backend server is offline or not running | Verify `uvicorn main:app --reload --port 8000` is running (or check Railway deployment status) |
| Red validation label under inputs | A required field is empty or contains an invalid Model Year | Double-check input values against the expected format for each field |
| "No Data Available" empty states | No classifications have been run, or browser cache was cleared | Navigate to the Predict tab and submit a new vehicle classification request |
| CORS block warnings in console | Client-origin headers mismatch API server middleware | Ensure the FastAPI backend's CORS config includes the frontend's deployed URL |
| Decision tree not rendering | `tree_json` failed to load from `/meta` endpoint | Refresh the Visualizations page or confirm the backend `/meta` endpoint is returning data |

---

## Frequently Asked Questions (FAQ)

**Q: How is the classification generated?**
The system passes the vehicle's Make, Model, County, and Model Year to a pre-trained Decision Tree Classifier. The model engineers additional features (region, vehicle age, model frequency) and calculates the likelihood of the vehicle being BEV or PHEV based on splits learned from 178,234 training samples.

**Q: Where is classification history stored?**
Recent classification history is displayed on the Dashboard for the current session. No vehicle identifiers or personal data are transmitted to external databases.

**Q: Can this application replace manufacturer specifications?**
No. This is an analytical and educational tool. All vehicle drivetrain confirmations should be verified through official manufacturer documentation or vehicle registration records.

**Q: Is an internet connection required?**
When hosted locally, both the React client and FastAPI server can operate entirely offline. When deployed to Vercel and Railway, an internet connection is required to reach the hosted backend.

**Q: Why does the first prediction sometimes take longer?**
If the backend is hosted on a free-tier platform, the server may need to "wake up" from an inactive state, which can take up to 50 seconds for the very first request after a period of inactivity.

---

## Best Practices

- **Validate Input Selections:** Ensure Make and Model combinations are realistic (e.g. don't select a Model not associated with the chosen Make) before submitting.
- **Explore the Decision Tree:** Use the Visualizations page after each prediction to understand exactly why the model reached its conclusion — this builds trust in the classification result.
- **Check Model Metrics Regularly:** Review the Dashboard's accuracy metrics periodically to understand the model's overall reliability (currently 75.82% test accuracy).

---

## Future Enhancements

Future platform versions plan to integrate:

- **User Authentication:** Secure portals to prevent unauthorized access.
- **Database Integration:** Persistent storage to log classification history across sessions.
- **Export Reports:** Downloadable and printable classification result sheets.
- **Random Forest Comparison:** Side-by-side comparison between Decision Tree and Random Forest classifier performance.
- **Notifications:** Toast alerts for server status changes and validation errors.
- **System Dark Mode:** A dark/light theme toggle.

---

## Conclusion

The BEVPHEV Prediction System provides a fast, responsive vehicle classification dashboard. By pairing a simple intake form with a lightweight machine learning microservice and an interactive decision tree visualization, the application helps users understand and trust how BEV/PHEV classifications are made from Washington State EV registration data.
