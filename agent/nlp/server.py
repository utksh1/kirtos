#!/usr/bin/env python3
"""
Kirtos NLP Intent Classifier — Inference Server
Runs a lightweight HTTP server for the Node.js agent to call.
"""

import os
import pickle
import json
import httpx
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# Load the trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "intent_model.pkl")
CORRECTIONS_PATH = os.path.join(os.path.dirname(__file__), "corrections.json")

with open(MODEL_PATH, "rb") as f:
    checkpoint = pickle.load(f)

model_name = checkpoint["model_name"]
classifier = checkpoint["classifier"]

print(f"🚀 Loading Sentence Transformer ({model_name})...")
model = SentenceTransformer(model_name)

# Get the list of all intent labels
intent_labels = classifier.classes_

app = FastAPI(title="Kirtos NLP Classifier")


class ClassifyRequest(BaseModel):
    text: str
    history: list[dict] = []


class ClassifyResponse(BaseModel):
    intent: str
    confidence: float
    alternatives: list[dict]
    source: str = "nlp"


class ExtractRequest(BaseModel):
    text: str
    intent: str
    schema: dict


class CorrectionRequest(BaseModel):
    text: str
    intent: str


@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    text = request.text.lower().strip()
    
    # Context-Awareness: prepend last message if it exists
    context_text = text
    if request.history:
        last_msg = request.history[-1]
        context_text = f"{last_msg['content']} -> {text}"
    
    print(f"🔍 [DEBUG] Classifying: '{context_text}'")

    # Generate embedding
    embedding = model.encode([context_text])

    # Predict with calibrated probabilities
    prediction = classifier.predict(embedding)[0]
    probabilities = classifier.predict_proba(embedding)[0]

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
        alternatives=alternatives,
        source="nlp"
    )


@app.post("/extract")
async def extract(request: ExtractRequest):
    """Use local Ollama to extract parameters from text based on intent schema."""
    prompt = f"""
TASK: Extract clean values for the intent '{request.intent}' from the user text.

USER TEXT: "{request.text}"
INTENT: {request.intent}
SCHEMA: {json.dumps(request.schema)}

RULES:
1. Return ONLY a valid JSON object.
2. The 'message' field should ONLY contain the actual message content, removing phrases like "tell him", "saying", "let him know".
3. The 'number' or 'recipient' field should be a name or phone number.
4. If a field is missing, use null.
5. NO conversational filler in your output.

JSON:"""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://127.0.0.1:11434/api/generate",
                json={
                    "model": "phi3:mini",
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=10.0
            )
            if response.status_code == 200:
                result = response.json()
                data = json.loads(result.get("response", "{}"))
                
                # Flatten if model nested under intent name
                if request.intent in data and isinstance(data[request.intent], dict):
                    data = data[request.intent]
                elif "parameters" in data and isinstance(data["parameters"], dict):
                    data = data["parameters"]
                
                return data
    except Exception as e:
        print(f"Ollama Extraction Error: {e}")
    
    return {}


@app.post("/add_correction")
async def add_correction(request: CorrectionRequest):
    """Save user feedback for future retraining."""
    try:
        corrections = []
        if os.path.exists(CORRECTIONS_PATH):
            with open(CORRECTIONS_PATH, "r") as f:
                corrections = json.load(f)
        
        # Avoid duplicates
        if not any(c['text'] == request.text and c['intent'] == request.intent for c in corrections):
            corrections.append({
                "text": request.text,
                "intent": request.intent,
                "ts": np.datetime64('now').item().isoformat()
            })
            
            with open(CORRECTIONS_PATH, "w") as f:
                json.dump(corrections, f, indent=2)
        
        return {"status": "success", "count": len(corrections)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "sentence-transformer-logistic-regression",
        "model_name": model_name,
        "intents": len(intent_labels),
        "classifier_size_kb": round(os.path.getsize(MODEL_PATH) / 1024)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("NLP_PORT", 5050))
    print(f"🧠 NLP Classifier starting on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
