#!/bin/bash

# Kill any existing processes on ports 3001, 5050, and 5173
echo "Stopping existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5050 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Starting Kirtos Workspace..."

# Start NLP classifier server (Python)
if [ -f agent/nlp/intent_model.pkl ]; then
    echo "🧠 Starting NLP classifier on port 5050..."
    source agent/.venv/bin/activate 2>/dev/null && \
    python agent/nlp/server.py &
    NLP_PID=$!
    sleep 1
fi

# Start Agent + App
echo "🚀 Starting Agent (port 3001) + App (port 5173)..."
npm start

# Cleanup on exit
trap "kill $NLP_PID 2>/dev/null" EXIT