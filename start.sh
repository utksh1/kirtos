#!/bin/bash

# Kill any existing processes on ports 3001 and 5173
echo "Stopping existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Starting Kirtos Workspace (Agent + App)..."
npm start
cd app
npm run dev
echo "The server is starting"