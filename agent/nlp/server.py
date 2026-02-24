#!/usr/bin/env python3
"""
Kirtos NLP Intent Classifier — Inference Server
Runs a lightweight HTTP server for the Node.js agent to call.
"""

import os
import pickle
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

# Load the trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "intent_model.pkl")

with open(MODEL_PATH, "rb") as f:
    pipeline = pickle.load(f)

# Get the list of all intent labels
intent_labels = pipeline.classes_

app = FastAPI(title="Kirtos NLP Classifier")


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    intent: str
    confidence: float
    alternatives: list[dict]


@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    text = request.text.lower().strip()

    # Predict with calibrated probabilities
    prediction = pipeline.predict([text])[0]
    probabilities = pipeline.predict_proba([text])[0]

    # Get top prediction confidence
    pred_idx = np.where(intent_labels == prediction)[0][0]
    confidence = float(probabilities[pred_idx])

    # Get top 3 alternatives
    top_indices = np.argsort(probabilities)[::-1][:3]
    alternatives = []
    for idx in top_indices:
        alternatives.append({
            "intent": str(intent_labels[idx]),
            "confidence": round(float(probabilities[idx]), 4)
        })

    return ClassifyResponse(
        intent=prediction,
        confidence=round(confidence, 4),
        alternatives=alternatives
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "tfidf-calibrated-linearsvc",
        "intents": len(intent_labels),
        "model_size_kb": round(os.path.getsize(MODEL_PATH) / 1024)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("NLP_PORT", 5050))
    print(f"🧠 NLP Classifier starting on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
