"""Tests for audio preprocessing"""
import pytest
import numpy as np
import torch
from preprocessing.audio_processor import AudioProcessor


class TestAudioProcessor:
    """Test AudioProcessor class"""

    @pytest.fixture
    def processor(self):
        """Create AudioProcessor instance"""
        return AudioProcessor(
            sample_rate=16000,
            n_mels=128,
            n_mfcc=40,
            hop_length=512,
        )

    def test_load_audio(self, processor, mock_audio_file):
        """Test audio loading"""
        audio, sr = processor.load_audio(mock_audio_file)

        assert isinstance(audio, np.ndarray)
        assert audio.dtype == np.float32
        assert sr == processor.sample_rate
        assert len(audio.shape) == 1

    def test_compute_mel_spectrogram(self, processor, mock_audio_data):
        """Test mel spectrogram computation"""
        audio, _ = mock_audio_data

        mel_spec = processor.compute_mel_spectrogram(audio)

        assert isinstance(mel_spec, np.ndarray)
        assert mel_spec.shape[0] == processor.n_mels
        assert mel_spec.ndim == 2
        assert not np.isnan(mel_spec).any()
        assert not np.isinf(mel_spec).any()

    def test_compute_mfcc(self, processor, mock_audio_data):
        """Test MFCC computation"""
        audio, _ = mock_audio_data

        mfcc = processor.compute_mfcc(audio)

        assert isinstance(mfcc, np.ndarray)
        assert mfcc.shape[0] == processor.n_mfcc
        assert mfcc.ndim == 2
        assert not np.isnan(mfcc).any()

    def test_extract_features(self, processor, mock_audio_data):
        """Test feature extraction"""
        audio, _ = mock_audio_data

        features = processor.extract_features(audio)

        assert 'mel_spectrogram' in features
        assert 'mfcc' in features
        assert 'zcr' in features
        assert 'spectral_centroid' in features
        assert 'spectral_rolloff' in features

        # Check mel spectrogram
        assert features['mel_spectrogram'].shape[0] == processor.n_mels

        # Check MFCC
        assert features['mfcc'].shape[0] == processor.n_mfcc

    def test_normalize_audio(self, processor):
        """Test audio normalization"""
        audio = np.array([0.5, -0.8, 0.3, -0.2], dtype=np.float32)

        normalized = processor.normalize_audio(audio)

        assert isinstance(normalized, np.ndarray)
        assert normalized.dtype == np.float32
        assert np.abs(normalized).max() <= 1.0

    def test_split_audio_chunks(self, processor, mock_audio_data):
        """Test audio chunking"""
        audio, _ = mock_audio_data
        chunk_duration = 30  # 30 seconds

        chunks = processor.split_audio_chunks(audio, chunk_duration)

        assert isinstance(chunks, list)
        assert len(chunks) > 0

        expected_chunk_length = processor.sample_rate * chunk_duration
        for chunk in chunks[:-1]:  # All except last chunk
            assert len(chunk) == expected_chunk_length

    def test_preprocess_for_model(self, processor, mock_audio_data):
        """Test preprocessing for model input"""
        audio, _ = mock_audio_data

        processed = processor.preprocess_for_model(audio)

        assert isinstance(processed, torch.Tensor)
        assert processed.ndim == 3  # (batch, channels, time)
        assert not torch.isnan(processed).any()
        assert not torch.isinf(processed).any()

    def test_empty_audio(self, processor):
        """Test handling of empty audio"""
        empty_audio = np.array([], dtype=np.float32)

        with pytest.raises((ValueError, ZeroDivisionError)):
            processor.compute_mel_spectrogram(empty_audio)

    def test_short_audio(self, processor):
        """Test handling of very short audio"""
        short_audio = np.random.randn(100).astype(np.float32)

        # Should not raise error, but handle gracefully
        mel_spec = processor.compute_mel_spectrogram(short_audio)
        assert mel_spec.shape[0] == processor.n_mels

    @pytest.mark.parametrize("sample_rate", [8000, 16000, 22050, 44100])
    def test_different_sample_rates(self, sample_rate):
        """Test with different sample rates"""
        processor = AudioProcessor(sample_rate=sample_rate)

        duration = 5  # 5 seconds
        audio = np.random.randn(sample_rate * duration).astype(np.float32)

        mel_spec = processor.compute_mel_spectrogram(audio)
        assert mel_spec.shape[0] == processor.n_mels

    def test_batch_processing(self, processor, mock_audio_data):
        """Test batch processing of audio chunks"""
        audio, _ = mock_audio_data
        chunks = processor.split_audio_chunks(audio, chunk_duration=30)

        batch_features = []
        for chunk in chunks[:5]:  # Process first 5 chunks
            features = processor.extract_features(chunk)
            batch_features.append(features)

        assert len(batch_features) == 5
        assert all('mel_spectrogram' in f for f in batch_features)
