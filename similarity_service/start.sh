#!/bin/bash

echo "🔁 Starting Similarity Service on http://localhost:8000 ..."
uvicorn similarity_service:app --host 0.0.0.0 --port 8000 --reload
