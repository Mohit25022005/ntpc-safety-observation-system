#!/bin/bash

echo "🚀 Starting Similarity Service..."
uvicorn similarity_service:app --host 0.0.0.0 --port 8000 --reload
