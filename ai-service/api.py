"""
api.py  —  Signa AI Service  (landmark-only pipeline)
=======================================================
Single source of truth for gesture prediction.
Uses ONLY the external .h5 model trained on MediaPipe 21-point landmarks.
All other models (KNN, TFLite CNN, heuristics) are DISABLED.

Preprocessing is delegated entirely to model_preprocess.py which replicates
the EXACT logic from ironcap95/asl-gesture (asl_recognizer/recognizer.py).
"""

import os
import logging
import numpy as np
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from tensorflow.keras.models import load_model

from model_preprocess import preprocess_landmarks

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Label map — MUST match ironcap95/asl-gesture label_map.json exactly
#   {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
# ---------------------------------------------------------------------------
LABELS = ["A", "B", "C", "D", "E"]

# ---------------------------------------------------------------------------
# Model — loaded once at startup
# ---------------------------------------------------------------------------
_model = None

def _load_external_model():
    global _model
    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "models", "external_model.h5"
    )
    if not os.path.exists(model_path):
        logger.error(f"Model file not found: {model_path}")
        return
    try:
        _model = load_model(model_path)
        logger.info(f"External ASL model loaded from {model_path}")
    except Exception as exc:
        logger.warning(f"Standard load_model failed ({exc}), attempting weight reconstruction fallback...")
        try:
            from keras.models import Sequential
            from keras.layers import Input, Dense, BatchNormalization, Dropout
            m = Sequential([
                Input(shape=(63,)),
                Dense(128, activation='relu', name='dense'),
                BatchNormalization(name='batch_normalization'),
                Dropout(0.3, name='dropout'),
                Dense(64, activation='relu', name='dense_1'),
                Dense(5, activation='softmax', name='dense_2')
            ])
            m.load_weights(model_path)
            _model = m
            logger.info(f"External ASL model reconstructed and weights loaded successfully from {model_path}")
        except Exception as fallback_exc:
            logger.error(f"Failed to load model in fallback: {fallback_exc}")
            _model = None


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_external_model()
    yield

app = FastAPI(title="Signa AI", version="3.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class LandmarkRequest(BaseModel):
    landmarks: list

class PredictResponse(BaseModel):
    predicted_class: str
    confidence: float
    top3: list
    method: str
    # kept for backward-compat with Node proxy / frontend
    cnn_class: Optional[str] = None
    cnn_confidence: Optional[float] = None
    knn_class: Optional[str] = "nothing"
    knn_confidence: Optional[float] = 0.0
    agreement: Optional[bool] = True
    models_info: Optional[dict] = None
    detected_sign: Optional[str] = None
    display_text: Optional[str] = None
    status: Optional[str] = None
    animation: Optional[str] = None
    state: Optional[str] = None


# ---------------------------------------------------------------------------
# Core prediction helper
# ---------------------------------------------------------------------------
def _predict(lms: list):
    """
    Run the external ASL model on 21 landmarks.
    Returns (label: str, confidence: float, top3: list).
    """
    if not lms or len(lms) < 21:
        return "no_hand", 0.0, []

    if _model is None:
        return "model_unavailable", 0.0, []

    # Exact preprocessing from ironcap95/asl-gesture
    processed = preprocess_landmarks(lms)

    # Debug logs (STEP 7 requirement)
    print(f"Input length: {len(processed)}")

    arr = np.array(processed).reshape(1, -1)
    preds = _model.predict(arr, verbose=0)[0]

    idx  = int(np.argmax(preds))
    conf = float(preds[idx])

    label = LABELS[idx] if idx < len(LABELS) else "unknown"

    # top-3 breakdown
    top3_indices = np.argsort(preds)[::-1][:3]
    top3 = [
        {"label": LABELS[i] if i < len(LABELS) else "?", "confidence": round(float(preds[i]), 4)}
        for i in top3_indices
    ]

    print(f"Prediction: {label}  Confidence: {conf:.4f}")
    return label, conf, top3


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "labels": LABELS,
    }


@app.get("/warmup")
def warmup():
    if _model is None:
        _load_external_model()
    return {"status": "warm" if _model is not None else "model_missing"}


@app.post("/predict/landmarks", response_model=PredictResponse)
def predict_landmarks_endpoint(req: LandmarkRequest):
    label, conf, top3 = _predict(req.landmarks)
    return PredictResponse(
        predicted_class=label,
        confidence=round(conf, 4),
        top3=top3,
        method="external_model",
        cnn_class=label,
        cnn_confidence=round(conf, 4),
    )


@app.post("/predict/ensemble", response_model=PredictResponse)
def predict_ensemble(req: LandmarkRequest):
    """
    Primary prediction endpoint called by the Node proxy.
    Uses ONLY the external landmark model — no KNN, no heuristics,
    no CNN image model.
    """
    label, conf, top3 = _predict(req.landmarks)

    if label in ("no_hand", "model_unavailable"):
        return PredictResponse(
            predicted_class=label,
            confidence=0.0,
            top3=[],
            method="external_model_error",
            cnn_class="nothing",
            cnn_confidence=0.0,
            agreement=False,
        )

    return PredictResponse(
        predicted_class=label,
        confidence=round(conf, 4),
        top3=top3,
        method="external_model",
        cnn_class=label,
        cnn_confidence=round(conf, 4),
        knn_class="nothing",
        knn_confidence=0.0,
        agreement=True,
        models_info={"external_model": {"status": "online", "conf": round(conf, 4)}},
    )


# Stub kept for backward compatibility (e.g. legacy image-based calls)
@app.post("/predict/image")
def predict_image_stub():
    raise HTTPException(
        status_code=410,
        detail="Image-based prediction is disabled. Use /predict/ensemble with landmarks.",
    )


@app.get("/classes")
def get_classes():
    return {"classes": LABELS, "count": len(LABELS)}


@app.get("/knn/status")
def knn_status():
    """KNN is disabled — returns static offline response."""
    return {"loaded": False, "classes": [], "class_count": 0, "note": "KNN disabled; using external_model only"}
