FROM python:3.11-slim

# Install system dependencies required for ML models and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    ffmpeg \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy poetry config
COPY pyproject.toml poetry.lock* ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copy application code
COPY . .

# We don't define an entrypoint here because this image is shared
# by both the FastAPI web server and the Celery background worker.
# The entrypoint is overridden in docker-compose.yml
