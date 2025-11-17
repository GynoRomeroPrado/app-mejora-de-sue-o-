"""Tests for ML models"""
import pytest
import torch
import numpy as np
from models.audio.cnn_model import SleepSoundCNN
from models.predictions.lstm_models import (
    SleepQualityLSTM,
    ApneaRiskLSTM,
    BurnoutPredictionLSTM,
    PredictionEnsemble,
)


class TestSleepSoundCNN:
    """Test SleepSoundCNN model"""

    @pytest.fixture
    def model(self):
        """Create model instance"""
        return SleepSoundCNN(num_classes=4, dropout=0.3)

    def test_model_initialization(self, model):
        """Test model initialization"""
        assert isinstance(model, torch.nn.Module)
        assert hasattr(model, 'conv1')
        assert hasattr(model, 'fc')

    def test_forward_pass(self, model, device):
        """Test forward pass"""
        batch_size = 4
        channels = 1
        height = 128
        width = 300

        x = torch.randn(batch_size, channels, height, width).to(device)
        model = model.to(device)
        model.eval()

        with torch.no_grad():
            output = model(x)

        assert output.shape == (batch_size, 4)
        assert not torch.isnan(output).any()
        assert not torch.isinf(output).any()

    def test_output_probabilities(self, model, device):
        """Test output probabilities sum to 1"""
        x = torch.randn(2, 1, 128, 300).to(device)
        model = model.to(device)
        model.eval()

        with torch.no_grad():
            output = model(x)
            probs = torch.softmax(output, dim=1)

        # Probabilities should sum to 1
        prob_sums = probs.sum(dim=1)
        assert torch.allclose(prob_sums, torch.ones_like(prob_sums), atol=1e-6)

    def test_different_input_sizes(self, model, device):
        """Test with different input sizes"""
        model = model.to(device)
        model.eval()

        # Test different time dimensions
        for time_dim in [100, 200, 300, 500]:
            x = torch.randn(2, 1, 128, time_dim).to(device)

            with torch.no_grad():
                output = model(x)

            assert output.shape == (2, 4)

    def test_gradient_flow(self, model, device):
        """Test gradient flow during training"""
        model = model.to(device)
        model.train()

        x = torch.randn(2, 1, 128, 300, requires_grad=True).to(device)
        target = torch.tensor([0, 1]).to(device)

        output = model(x)
        loss = torch.nn.functional.cross_entropy(output, target)
        loss.backward()

        # Check gradients exist
        assert x.grad is not None
        for param in model.parameters():
            if param.requires_grad:
                assert param.grad is not None

    @pytest.mark.parametrize("num_classes", [2, 4, 6])
    def test_different_num_classes(self, num_classes, device):
        """Test with different number of classes"""
        model = SleepSoundCNN(num_classes=num_classes).to(device)
        x = torch.randn(2, 1, 128, 300).to(device)

        model.eval()
        with torch.no_grad():
            output = model(x)

        assert output.shape == (2, num_classes)


class TestSleepQualityLSTM:
    """Test SleepQualityLSTM model"""

    @pytest.fixture
    def model(self):
        """Create model instance"""
        return SleepQualityLSTM(input_size=20, hidden_size=128, num_layers=2)

    def test_model_initialization(self, model):
        """Test model initialization"""
        assert isinstance(model, torch.nn.Module)
        assert hasattr(model, 'lstm')
        assert hasattr(model, 'fc_layers')

    def test_forward_pass(self, model, device):
        """Test forward pass"""
        batch_size = 4
        seq_length = 30
        input_size = 20

        x = torch.randn(batch_size, seq_length, input_size).to(device)
        model = model.to(device)
        model.eval()

        with torch.no_grad():
            output = model(x)

        assert output.shape == (batch_size, 1)
        assert not torch.isnan(output).any()
        assert not torch.isinf(output).any()

        # Output should be between 0 and 1 (sigmoid)
        assert (output >= 0).all() and (output <= 1).all()

    def test_variable_sequence_length(self, model, device):
        """Test with variable sequence lengths"""
        model = model.to(device)
        model.eval()

        for seq_len in [7, 14, 30, 60]:
            x = torch.randn(2, seq_len, 20).to(device)

            with torch.no_grad():
                output = model(x)

            assert output.shape == (2, 1)

    def test_gradient_flow(self, model, device):
        """Test gradient flow"""
        model = model.to(device)
        model.train()

        x = torch.randn(2, 30, 20, requires_grad=True).to(device)
        target = torch.tensor([[0.85], [0.72]]).to(device)

        output = model(x)
        loss = torch.nn.functional.mse_loss(output, target)
        loss.backward()

        assert x.grad is not None


class TestApneaRiskLSTM:
    """Test ApneaRiskLSTM model"""

    def test_forward_pass(self, device):
        """Test forward pass"""
        model = ApneaRiskLSTM(input_size=15, hidden_size=64, num_layers=2).to(device)
        model.eval()

        x = torch.randn(4, 30, 15).to(device)

        with torch.no_grad():
            output = model(x)

        assert output.shape == (4, 1)
        assert (output >= 0).all() and (output <= 1).all()


class TestBurnoutPredictionLSTM:
    """Test BurnoutPredictionLSTM model"""

    def test_forward_pass(self, device):
        """Test forward pass"""
        model = BurnoutPredictionLSTM(input_size=25, hidden_size=96, num_layers=2).to(device)
        model.eval()

        x = torch.randn(4, 30, 25).to(device)

        with torch.no_grad():
            output = model(x)

        assert output.shape == (4, 1)
        assert (output >= 0).all() and (output <= 1).all()


class TestPredictionEnsemble:
    """Test PredictionEnsemble"""

    @pytest.fixture
    def ensemble(self):
        """Create ensemble instance"""
        return PredictionEnsemble()

    def test_ensemble_initialization(self, ensemble):
        """Test ensemble initialization"""
        assert hasattr(ensemble, 'quality_model')
        assert hasattr(ensemble, 'apnea_model')
        assert hasattr(ensemble, 'burnout_model')

    def test_predict_all(self, ensemble, device):
        """Test prediction with all models"""
        ensemble = ensemble.to(device)
        ensemble.eval()

        # Mock input data for different models
        quality_input = torch.randn(1, 30, 20).to(device)
        apnea_input = torch.randn(1, 30, 15).to(device)
        burnout_input = torch.randn(1, 30, 25).to(device)

        with torch.no_grad():
            predictions = ensemble.predict_all(
                quality_input,
                apnea_input,
                burnout_input
            )

        assert 'quality_score' in predictions
        assert 'apnea_risk' in predictions
        assert 'burnout_risk' in predictions

        # Check all predictions are in valid range
        assert 0 <= predictions['quality_score'] <= 1
        assert 0 <= predictions['apnea_risk'] <= 1
        assert 0 <= predictions['burnout_risk'] <= 1

    def test_batch_predictions(self, ensemble, device):
        """Test batch predictions"""
        ensemble = ensemble.to(device)
        ensemble.eval()

        batch_size = 8
        quality_input = torch.randn(batch_size, 30, 20).to(device)
        apnea_input = torch.randn(batch_size, 30, 15).to(device)
        burnout_input = torch.randn(batch_size, 30, 25).to(device)

        with torch.no_grad():
            predictions = ensemble.predict_all(
                quality_input,
                apnea_input,
                burnout_input
            )

        # Should return single predictions (averaged or from first batch item)
        assert isinstance(predictions['quality_score'], (float, int, torch.Tensor))


class TestModelSaveLoad:
    """Test model saving and loading"""

    def test_save_and_load_cnn(self, temp_model_path, device):
        """Test saving and loading CNN model"""
        model = SleepSoundCNN(num_classes=4)

        # Save model
        save_path = temp_model_path / "cnn_model.pt"
        torch.save(model.state_dict(), save_path)

        # Load model
        loaded_model = SleepSoundCNN(num_classes=4)
        loaded_model.load_state_dict(torch.load(save_path))
        loaded_model.to(device)
        loaded_model.eval()

        # Test inference
        x = torch.randn(2, 1, 128, 300).to(device)
        with torch.no_grad():
            output = loaded_model(x)

        assert output.shape == (2, 4)

    def test_save_and_load_lstm(self, temp_model_path, device):
        """Test saving and loading LSTM model"""
        model = SleepQualityLSTM(input_size=20)

        # Save model
        save_path = temp_model_path / "lstm_model.pt"
        torch.save(model.state_dict(), save_path)

        # Load model
        loaded_model = SleepQualityLSTM(input_size=20)
        loaded_model.load_state_dict(torch.load(save_path))
        loaded_model.to(device)
        loaded_model.eval()

        # Test inference
        x = torch.randn(2, 30, 20).to(device)
        with torch.no_grad():
            output = loaded_model(x)

        assert output.shape == (2, 1)
