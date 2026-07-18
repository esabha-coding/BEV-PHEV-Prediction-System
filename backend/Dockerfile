# Use a lightweight python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the dataset from workspace root (handled via compose context)
COPY dataset/Electric_Vehicle_Population_Data.csv .

# Copy backend source files
COPY backend/ /app/

# Run the training script to pre-train and serialize the model assets
RUN python train_model.py

# Expose FastAPI port
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
