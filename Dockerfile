# Use the official Python 3.11 image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the necessary directories to the container
COPY backend /app/backend
COPY data /app/data
COPY models /app/models
COPY HybridModel /app/HybridModel

# Set environment variables for FastAPI
ENV HOST=0.0.0.0
ENV PORT=7860

# Expose port 7860 (Hugging Face standard)
EXPOSE 7860

# Command to run the FastAPI app via Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
