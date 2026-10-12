FROM python:3.11-slim

# Install system dependencies for PostgreSQL and PaddleOCR/Docling if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy python dependency files
# Copy all files so pip can build the package
COPY . .
RUN pip install --upgrade pip && pip install .

# Expose FastAPI port
EXPOSE 8000

# Script to run migrations and start the server
COPY scripts/start.sh /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh

CMD ["/app/scripts/start.sh"]
