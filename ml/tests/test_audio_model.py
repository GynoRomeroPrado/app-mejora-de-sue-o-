"""
Tests for audio analysis model
"""

import pytest
import torch
import numpy as np

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.audio_analysis.model import (
    SleepAnalysisModel,
    AudioFeatureExtractor,
    MultiHeadAttention,
    SleepAnalysisLoss,
    create_model
)


class TestAudioFeatureExtractor:
    """Test audio feature extractor"""

    def test_initialization(self):
        """Test model initialization"""
        extractor = AudioFeatureExtractor(n_mels=128, hidden_dim=256)
        assert extractor.output_dim == 512 * (128 // 16)

    def test_forward_shape(self):
        """Test forward pass output shape"""
        extractor = AudioFeatureExtractor(n_mels=128)
        dummy_input = torch.randn(2, 1, 128, 1875)  # (batch, channel, freq, time)

        output = extractor(dummy_input)

        assert output.shape[0] == 2  # batch size
        assert output.shape[1] == 1875  # time steps
        assert output.dim() == 3


class TestMultiHeadAttention:
    """Test multi-head attention mechanism"""

    def test_initialization(self):
        """Test attention initialization"""
        attention = MultiHeadAttention(hidden_dim=256, num_heads=8)
        assert attention.num_heads == 8
        assert attention.head_dim == 32

    def test_forward_shape(self):
        """Test attention forward pass"""
        attention = MultiHeadAttention(hidden_dim=256, num_heads=8)
        dummy_input = torch.randn(2, 100, 256)  # (batch, seq_len, hidden)

        output = attention(dummy_input)

        assert output.shape == dummy_input.shape

    def test_with_mask(self):
        """Test attention with mask"""
        attention = MultiHeadAttention(hidden_dim=256, num_heads=8)
        dummy_input = torch.randn(2, 100, 256)
        mask = torch.ones(2, 100)
        mask[:, 50:] = 0  # Mask second half

        output = attention(dummy_input, mask)

        assert output.shape == dummy_input.shape


class TestSleepAnalysisModel:
    """Test complete sleep analysis model"""

    def test_initialization(self):
        """Test model initialization"""
        model = create_model()
        assert isinstance(model, SleepAnalysisModel)

    def test_forward_pass(self):
        """Test forward pass"""
        model = create_model()
        dummy_input = torch.randn(2, 1, 128, 1875)

        outputs = model(dummy_input)

        assert 'sleep_phase' in outputs
        assert 'event_detection' in outputs
        assert 'severity' in outputs
        assert 'confidence' in outputs

    def test_output_shapes(self):
        """Test output shapes are correct"""
        model = create_model()
        batch_size = 2
        time_steps = 1875
        dummy_input = torch.randn(batch_size, 1, 128, time_steps)

        outputs = model(dummy_input)

        # Sleep phase: (batch, time, 4 phases)
        assert outputs['sleep_phase'].shape == (batch_size, time_steps, 4)

        # Event detection: (batch, time, 5 event types)
        assert outputs['event_detection'].shape == (batch_size, time_steps, 5)

        # Severity: (batch, time, 3 levels)
        assert outputs['severity'].shape == (batch_size, time_steps, 3)

        # Confidence: (batch, time, 1)
        assert outputs['confidence'].shape == (batch_size, time_steps, 1)

    def test_predict_mode(self):
        """Test prediction mode"""
        model = create_model()
        dummy_input = torch.randn(1, 1, 128, 1875)

        predictions = model.predict(dummy_input)

        # Check softmax/sigmoid applied
        assert 'sleep_phase' in predictions
        assert predictions['sleep_phase'].max() <= 1.0
        assert predictions['sleep_phase'].min() >= 0.0

        assert 'confidence' in predictions
        assert predictions['confidence'].max() <= 1.0
        assert predictions['confidence'].min() >= 0.0

    def test_model_parameters(self):
        """Test model has trainable parameters"""
        model = create_model()

        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

        assert total_params > 0
        assert trainable_params == total_params
        print(f"Model has {total_params:,} parameters")


class TestSleepAnalysisLoss:
    """Test multi-task loss function"""

    def test_initialization(self):
        """Test loss initialization"""
        loss_fn = SleepAnalysisLoss()
        assert loss_fn.phase_weight == 1.0
        assert loss_fn.event_weight == 1.0

    def test_loss_computation(self):
        """Test loss computation"""
        loss_fn = SleepAnalysisLoss()

        batch_size = 2
        time_steps = 100

        # Create dummy predictions
        predictions = {
            'sleep_phase': torch.randn(batch_size, time_steps, 4),
            'event_detection': torch.randn(batch_size, time_steps, 5),
            'severity': torch.randn(batch_size, time_steps, 3),
            'confidence': torch.rand(batch_size, time_steps, 1),
        }

        # Create dummy targets
        targets = {
            'sleep_phase': torch.randint(0, 4, (batch_size, time_steps)),
            'event_detection': torch.rand(batch_size, time_steps, 5),
            'severity': torch.randint(0, 3, (batch_size, time_steps)),
            'confidence': torch.rand(batch_size, time_steps, 1),
        }

        total_loss, loss_dict = loss_fn(predictions, targets)

        assert total_loss.item() >= 0
        assert 'total' in loss_dict
        assert 'phase' in loss_dict
        assert 'event' in loss_dict
        assert 'severity' in loss_dict
        assert 'confidence' in loss_dict

    def test_backward_pass(self):
        """Test that loss can be backpropagated"""
        model = create_model()
        loss_fn = SleepAnalysisLoss()

        # Create dummy data
        batch_size = 2
        time_steps = 100

        dummy_input = torch.randn(batch_size, 1, 128, time_steps)
        predictions = model(dummy_input)

        targets = {
            'sleep_phase': torch.randint(0, 4, (batch_size, time_steps)),
            'event_detection': torch.rand(batch_size, time_steps, 5),
            'severity': torch.randint(0, 3, (batch_size, time_steps)),
            'confidence': torch.rand(batch_size, time_steps, 1),
        }

        total_loss, _ = loss_fn(predictions, targets)

        # Check gradients
        total_loss.backward()

        # Verify some parameters have gradients
        has_gradients = any(
            p.grad is not None and p.grad.abs().sum() > 0
            for p in model.parameters()
        )
        assert has_gradients


class TestModelInference:
    """Test model inference scenarios"""

    def test_single_sample_inference(self):
        """Test inference on single sample"""
        model = create_model()
        model.eval()

        dummy_input = torch.randn(1, 1, 128, 1875)

        with torch.no_grad():
            predictions = model.predict(dummy_input)

        assert predictions['sleep_phase'].shape[0] == 1

    def test_batch_inference(self):
        """Test inference on batch"""
        model = create_model()
        model.eval()

        batch_size = 4
        dummy_input = torch.randn(batch_size, 1, 128, 1875)

        with torch.no_grad():
            predictions = model.predict(dummy_input)

        assert predictions['sleep_phase'].shape[0] == batch_size

    def test_model_device_compatibility(self):
        """Test model works on CPU and GPU (if available)"""
        model = create_model()

        # Test on CPU
        model = model.cpu()
        dummy_input = torch.randn(1, 1, 128, 1875).cpu()

        outputs = model(dummy_input)
        assert outputs['sleep_phase'].device.type == 'cpu'

        # Test on GPU if available
        if torch.cuda.is_available():
            model = model.cuda()
            dummy_input = dummy_input.cuda()

            outputs = model(dummy_input)
            assert outputs['sleep_phase'].device.type == 'cuda'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
