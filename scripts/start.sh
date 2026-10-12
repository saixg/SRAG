#!/bin/bash
set -e

echo "Running Database Migrations..."
python -m alembic upgrade head

echo "Starting FastAPI Server..."
python -m uvicorn srag.main:app --host 0.0.0.0 --port 8000
