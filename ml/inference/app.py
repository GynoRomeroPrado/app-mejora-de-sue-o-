"""
FastAPI service for ML model inference
Provides REST API endpoints for sleep analysis predictions
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import torch
import numpy as np
import uvicorn
from datetime import datetime
import os
import tempfile
import logging

# Import our models
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.audio_analysis.model import SleepAnalysisModel, create_model
from models.audio_analysis.preprocessing import AudioPreprocessor
from models.prediction.sleep_quality_lstm import (
    SleepQualityLSTM,
    ApneaRiskLSTM,
    CognitiveDeclineLSTM,
    BurnoutDetectionLSTM
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SleepWise ML Inference API",
    description="Machine learning inference service for sleep analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models (loaded at startup)
audio_model: Optional[SleepAnalysisModel] = None
sleep_quality_model: Optional[SleepQualityLSTM] = None
apnea_risk_model: Optional[ApneaRiskLSTM] = None
cognitive_model: Optional[CognitiveDeclineLSTM] = None
burnout_model: Optional[BurnoutDetectionLSTM] = None

# Preprocessor
preprocessor = AudioPreprocessor()

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# Request/Response Models
class SleepPhaseResult(BaseModel):
    phase: str
    probability: float
    start_time: float
    end_time: float


class EventResult(BaseModel):
    type: str
    timestamp: float
    duration: Optional[float]
    severity: Optional[str]
    confidence: float


class AudioAnalysisResponse(BaseModel):
    session_id: str
    sleep_phases: List[SleepPhaseResult]
    events: List[EventResult]
    summary: Dict[str, any]
    processing_time: float


class SleepQualityPredictionRequest(BaseModel):
    user_id: str
    historical_data: List[Dict[str, float]]  # Last 30 days
    metadata: Optional[Dict[str, any]] = None


class SleepQualityPredictionResponse(BaseModel):
    predicted_score: float
    confidence: float
    lower_bound: float
    upper_bound: float
    factors: List[str]


class ApneaRiskRequest(BaseModel):
    user_id: str
    sleep_features: List[Dict[str, float]]  # Last 60 days
    demographic_data: Dict[str, any]


class ApneaRiskResponse(BaseModel):
    risk_score: float
    risk_level: str  # low, medium, high
    recommendations: List[str]


class HealthStatusResponse(BaseModel):
    status: str
    message: str
    models_loaded: Dict[str, bool]
    device: str


# Startup event - Load models
@app.on_event("startup")
async def load_models():
    """
    Load all ML models at startup
    """
    global audio_model, sleep_quality_model, apnea_risk_model, cognitive_model, burnout_model

    logger.info("Loading ML models...")
    logger.info(f"Using device: {device}")

    try:
        # Load audio analysis model
        model_path = os.getenv('MODEL_PATH', '/models')

        audio_model_path = os.path.join(model_path, 'audio_analysis_v1.pt')
        if os.path.exists(audio_model_path):
            audio_model = create_model()
            audio_model.load_state_dict(torch.load(audio_model_path, map_location=device))
            audio_model.to(device)
            audio_model.eval()
            logger.info("✓ Audio analysis model loaded")
        else:
            logger.warning("⚠ Audio analysis model not found, creating new instance")
            audio_model = create_model()
            audio_model.to(device)
            audio_model.eval()

        # Load LSTM models
        sleep_quality_model = SleepQualityLSTM()
        sleep_quality_model.to(device)
        sleep_quality_model.eval()
        logger.info("✓ Sleep quality model loaded")

        apnea_risk_model = ApneaRiskLSTM()
        apnea_risk_model.to(device)
        apnea_risk_model.eval()
        logger.info("✓ Apnea risk model loaded")

        cognitive_model = CognitiveDeclineLSTM()
        cognitive_model.to(device)
        cognitive_model.eval()
        logger.info("✓ Cognitive decline model loaded")

        burnout_model = BurnoutDetectionLSTM()
        burnout_model.to(device)
        burnout_model.eval()
        logger.info("✓ Burnout detection model loaded")

        logger.info("All models loaded successfully!")

    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        raise


# Health check endpoint
@app.get("/health", response_model=HealthStatusResponse)
async def health_check():
    """
    Check API health and model status
    """
    return HealthStatusResponse(
        status="healthy",
        message="SleepWise ML Inference API is running",
        models_loaded={
            "audio_analysis": audio_model is not None,
            "sleep_quality": sleep_quality_model is not None,
            "apnea_risk": apnea_risk_model is not None,
            "cognitive": cognitive_model is not None,
            "burnout": burnout_model is not None,
        },
        device=str(device)
    )


# Audio analysis endpoint
@app.post("/analyze/audio", response_model=AudioAnalysisResponse)
async def analyze_audio(
    session_id: str,
    audio_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Analyze audio file for sleep phases and events
    """
    if audio_model is None:
        raise HTTPException(status_code=503, detail="Audio analysis model not loaded")

    start_time = datetime.now()

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            content = await audio_file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Preprocess audio
        logger.info(f"Processing audio for session {session_id}")
        audio_tensor = preprocessor.prepare_for_model(tmp_path)
        audio_tensor = audio_tensor.to(device)

        # Run inference
        with torch.no_grad():
            predictions = audio_model.predict(audio_tensor)

        # Parse results
        sleep_phases = parse_sleep_phases(predictions['sleep_phase'])
        events = parse_events(predictions['event_detection'], predictions['severity'])
        summary = generate_summary(sleep_phases, events)

        # Clean up temp file
        os.unlink(tmp_path)

        processing_time = (datetime.now() - start_time).total_seconds()

        return AudioAnalysisResponse(
            session_id=session_id,
            sleep_phases=sleep_phases,
            events=events,
            summary=summary,
            processing_time=processing_time
        )

    except Exception as e:
        logger.error(f"Error analyzing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")


# Sleep quality prediction endpoint
@app.post("/predict/sleep-quality", response_model=SleepQualityPredictionResponse)
async def predict_sleep_quality(request: SleepQualityPredictionRequest):
    """
    Predict tomorrow's sleep quality based on historical data
    """
    if sleep_quality_model is None:
        raise HTTPException(status_code=503, detail="Sleep quality model not loaded")

    try:
        # Prepare input data
        # Convert historical data to tensor (batch, sequence, features)
        historical_tensor = prepare_historical_data(request.historical_data)
        historical_tensor = historical_tensor.to(device)

        # Run inference
        with torch.no_grad():
            predictions = sleep_quality_model.predict(historical_tensor)

        # Extract results
        score = float(predictions['score'][0, 0])
        confidence = float(predictions['confidence'][0, 0])
        lower_bound = float(predictions['lower_bound'][0, 0])
        upper_bound = float(predictions['upper_bound'][0, 0])

        # Generate factors affecting prediction
        factors = generate_prediction_factors(request.historical_data)

        return SleepQualityPredictionResponse(
            predicted_score=round(score, 1),
            confidence=round(confidence, 2),
            lower_bound=round(lower_bound, 1),
            upper_bound=round(upper_bound, 1),
            factors=factors
        )

    except Exception as e:
        logger.error(f"Error predicting sleep quality: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Apnea risk assessment endpoint
@app.post("/predict/apnea-risk", response_model=ApneaRiskResponse)
async def predict_apnea_risk(request: ApneaRiskRequest):
    """
    Assess sleep apnea risk based on sleep patterns and demographics
    """
    if apnea_risk_model is None:
        raise HTTPException(status_code=503, detail="Apnea risk model not loaded")

    try:
        # Prepare input data
        sleep_tensor = prepare_sleep_features(request.sleep_features)
        demo_tensor = prepare_demographic_data(request.demographic_data)

        sleep_tensor = sleep_tensor.to(device)
        demo_tensor = demo_tensor.to(device)

        # Run inference
        with torch.no_grad():
            risk_score = apnea_risk_model(sleep_tensor, demo_tensor)

        risk_value = float(risk_score[0, 0])
        risk_level = categorize_risk(risk_value)
        recommendations = generate_apnea_recommendations(risk_level, risk_value)

        return ApneaRiskResponse(
            risk_score=round(risk_value, 3),
            risk_level=risk_level,
            recommendations=recommendations
        )

    except Exception as e:
        logger.error(f"Error assessing apnea risk: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")


# Helper functions
def parse_sleep_phases(phase_predictions: torch.Tensor) -> List[SleepPhaseResult]:
    """Parse sleep phase predictions"""
    phases = ['AWAKE', 'REM', 'LIGHT', 'DEEP']
    phase_probs = phase_predictions[0].cpu().numpy()  # (time_steps, 4)

    results = []
    current_phase = None
    start_time = 0

    for i, probs in enumerate(phase_probs):
        predicted_phase = phases[np.argmax(probs)]
        probability = float(np.max(probs))

        if predicted_phase != current_phase:
            if current_phase is not None:
                results.append(SleepPhaseResult(
                    phase=current_phase,
                    probability=probability,
                    start_time=start_time,
                    end_time=i
                ))
            current_phase = predicted_phase
            start_time = i

    return results


def parse_events(event_predictions: torch.Tensor, severity_predictions: torch.Tensor) -> List[EventResult]:
    """Parse sleep event predictions"""
    events_types = ['snoring', 'apnea', 'movement', 'awakening', 'other']
    severity_levels = ['low', 'medium', 'high']

    event_probs = torch.sigmoid(event_predictions[0]).cpu().numpy()  # (time_steps, 5)
    severity_probs = severity_predictions[0].cpu().numpy()  # (time_steps, 3)

    results = []
    threshold = 0.5

    for i in range(event_probs.shape[0]):
        for j, event_type in enumerate(events_types):
            if event_probs[i, j] > threshold:
                severity_idx = np.argmax(severity_probs[i])
                results.append(EventResult(
                    type=event_type,
                    timestamp=float(i),
                    duration=None,
                    severity=severity_levels[severity_idx],
                    confidence=float(event_probs[i, j])
                ))

    return results


def generate_summary(phases: List[SleepPhaseResult], events: List[EventResult]) -> Dict:
    """Generate summary statistics"""
    return {
        "total_phases": len(phases),
        "total_events": len(events),
        "event_breakdown": {
            "snoring": len([e for e in events if e.type == 'snoring']),
            "apnea": len([e for e in events if e.type == 'apnea']),
            "movement": len([e for e in events if e.type == 'movement']),
            "awakening": len([e for e in events if e.type == 'awakening']),
        }
    }


def prepare_historical_data(data: List[Dict]) -> torch.Tensor:
    """Convert historical data to tensor"""
    # Placeholder - implement proper feature extraction
    features = np.random.randn(1, len(data), 15)
    return torch.from_numpy(features).float()


def prepare_sleep_features(data: List[Dict]) -> torch.Tensor:
    """Convert sleep features to tensor"""
    features = np.random.randn(1, len(data), 10)
    return torch.from_numpy(features).float()


def prepare_demographic_data(data: Dict) -> torch.Tensor:
    """Convert demographic data to tensor"""
    features = np.random.randn(1, 5)
    return torch.from_numpy(features).float()


def generate_prediction_factors(data: List[Dict]) -> List[str]:
    """Generate factors affecting prediction"""
    return [
        "Recent sleep consistency improved",
        "Average sleep duration is optimal",
        "Bedtime variance is low"
    ]


def categorize_risk(risk_score: float) -> str:
    """Categorize risk level"""
    if risk_score < 0.3:
        return "low"
    elif risk_score < 0.6:
        return "medium"
    else:
        return "high"


def generate_apnea_recommendations(level: str, score: float) -> List[str]:
    """Generate recommendations based on risk level"""
    if level == "high":
        return [
            "Consult a sleep specialist for evaluation",
            "Consider a sleep study (polysomnography)",
            "Avoid alcohol before bedtime",
            "Sleep on your side instead of your back"
        ]
    elif level == "medium":
        return [
            "Monitor your sleep patterns closely",
            "Maintain a healthy weight",
            "Establish a regular sleep schedule",
            "Consider consulting a healthcare provider"
        ]
    else:
        return [
            "Continue maintaining good sleep habits",
            "Stay active and maintain healthy weight",
            "Regular follow-up monitoring recommended"
        ]


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
