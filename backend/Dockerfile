FROM python:3.10-slim@sha256:fd76ade0c607f27677bc04be3c60749f400eedc941d9e72967e19a4cedff80c2

WORKDIR /app

# Install ffmpeg for whisper
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Ensure live WebSockets and faster-whisper 1.0.2's undeclared requests import.
RUN pip install --no-cache-dir "uvicorn[standard]" "requests==2.34.2"
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

# Copy backend source
COPY backend/ .

EXPOSE 8000

CMD ["python", "docker_start.py"]
