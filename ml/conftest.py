"""Pytest configuration and fixtures"""
import pytest
import torch
import numpy as np
from pathlib import Path


@pytest.fixture
def mock_audio_data():
    """Generate mock audio data for testing"""
    # Simulate 5 minutes of audio at 16kHz
    sample_rate = 16000
    duration = 300  # 5 minutes
    num_samples = sample_rate * duration

    # Generate random audio data
    audio = np.random.randn(num_samples).astype(np.float32)
    return audio, sample_rate


@pytest.fixture
def mock_mel_spectrogram():
    """Generate mock mel spectrogram"""
    # Shape: (n_mels, time_steps)
    n_mels = 128
    time_steps = 300
    mel_spec = np.random.randn(n_mels, time_steps).astype(np.float32)
    return mel_spec


@pytest.fixture
def mock_mfcc_features():
    """Generate mock MFCC features"""
    # Shape: (n_mfcc, time_steps)
    n_mfcc = 40
    time_steps = 300
    mfcc = np.random.randn(n_mfcc, time_steps).astype(np.float32)
    return mfcc


@pytest.fixture
def mock_sleep_features():
    """Generate mock sleep session features"""
    return {
        'duration': 480.0,  # 8 hours in minutes
        'total_deep_sleep': 120.0,
        'total_rem_sleep': 90.0,
        'total_light_sleep': 270.0,
        'sleep_efficiency': 0.95,
        'sleep_latency': 15.0,
        'wake_after_sleep_onset': 20.0,
        'num_awakenings': 2,
        'snoring_events': 5,
        'movement_events': 10,
        'heart_rate_avg': 65.0,
        'heart_rate_variability': 50.0,
        'breathing_rate_avg': 14.0,
    }


@pytest.fixture
def mock_historical_sessions():
    """Generate mock historical sleep sessions"""
    num_sessions = 30
    sessions = []

    for i in range(num_sessions):
        session = {
            'date': f'2024-01-{i+1:02d}',
            'duration': np.random.uniform(360, 540),  # 6-9 hours
            'quality_score': np.random.uniform(60, 95),
            'deep_sleep': np.random.uniform(60, 150),
            'rem_sleep': np.random.uniform(60, 120),
            'light_sleep': np.random.uniform(180, 300),
            'awakenings': np.random.randint(0, 5),
        }
        sessions.append(session)

    return sessions


@pytest.fixture
def mock_cnn_model():
    """Mock CNN model for testing"""
    from models.audio.cnn_model import SleepSoundCNN
    model = SleepSoundCNN(num_classes=4)
    model.eval()
    return model


@pytest.fixture
def mock_lstm_model():
    """Mock LSTM model for testing"""
    from models.predictions.lstm_models import SleepQualityLSTM
    model = SleepQualityLSTM(input_size=20, hidden_size=128, num_layers=2)
    model.eval()
    return model


@pytest.fixture
def device():
    """Get device for testing (CPU)"""
    return torch.device('cpu')


@pytest.fixture
def temp_model_path(tmp_path):
    """Temporary path for saving/loading models"""
    model_dir = tmp_path / "models"
    model_dir.mkdir()
    return model_dir


@pytest.fixture
def mock_audio_file(tmp_path, mock_audio_data):
    """Create a temporary audio file"""
    import soundfile as sf

    audio_path = tmp_path / "test_audio.wav"
    audio, sample_rate = mock_audio_data
    sf.write(str(audio_path), audio, sample_rate)

    return str(audio_path)


# Hooks
def pytest_configure(config):
    """Configure pytest"""
    # Set random seeds for reproducibility
    np.random.seed(42)
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(42)


def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    # Add markers automatically
    for item in items:
        if "slow" in item.nodeid:
            item.add_marker(pytest.mark.slow)
        if "gpu" in item.nodeid:
            item.add_marker(pytest.mark.gpu)
