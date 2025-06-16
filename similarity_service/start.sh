#!/bin/bash

echo "🚀 Starting Similarity Service on Render..."
gunicorn -k uvicorn.workers.UvicornWorker similarity_service:app --bind 0.0.0.0:$PORT
