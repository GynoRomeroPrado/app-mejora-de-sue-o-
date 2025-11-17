"""
Sleep Quality Prediction LSTM Model
Predicts next night's sleep score based on historical patterns
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional


class SleepQualityLSTM(nn.Module):
    """
    LSTM-based model for predicting sleep quality
    Uses historical sleep data to forecast future sleep scores
    """
    def __init__(
        self,
        input_dim: int = 15,  # Features per night
        hidden_dim: int = 128,
        num_layers: int = 3,
        dropout: float = 0.3,
        sequence_length: int = 30,  # 30 days of history
    ):
        super().__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.sequence_length = sequence_length

        # Feature embedding
        self.input_projection = nn.Linear(input_dim, hidden_dim)

        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=False,
        )

        # Prediction heads
        self.score_predictor = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),  # Sleep score (0-100)
        )

        # Confidence predictor
        self.confidence_predictor = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),  # Confidence (0-1)
        )

        # Uncertainty bounds predictor
        self.uncertainty_predictor = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 2),  # Lower and upper bounds
            nn.Softplus(),  # Ensure positive
        )

    def forward(
        self,
        x: torch.Tensor,
        hidden: Optional[Tuple[torch.Tensor, torch.Tensor]] = None
    ) -> dict:
        """
        Args:
            x: (batch, sequence_length, input_dim) - Historical sleep data
            hidden: Optional LSTM hidden state
        Returns:
            dict with:
                - score: (batch, 1) - Predicted sleep score
                - confidence: (batch, 1) - Prediction confidence
                - lower_bound: (batch, 1) - Lower confidence interval
                - upper_bound: (batch, 1) - Upper confidence interval
        """
        batch_size = x.size(0)

        # Project input features
        x = self.input_projection(x)  # (batch, seq, hidden_dim)

        # LSTM processing
        if hidden is None:
            lstm_out, hidden = self.lstm(x)
        else:
            lstm_out, hidden = self.lstm(x, hidden)

        # Use last hidden state for prediction
        last_hidden = lstm_out[:, -1, :]  # (batch, hidden_dim)

        # Predictions
        score = self.score_predictor(last_hidden)  # (batch, 1)
        confidence = self.confidence_predictor(last_hidden)  # (batch, 1)
        uncertainty = self.uncertainty_predictor(last_hidden)  # (batch, 2)

        # Ensure score is in valid range (0-100)
        score = torch.clamp(score, 0, 100)

        # Calculate confidence intervals
        lower_bound = score - uncertainty[:, 0:1]
        upper_bound = score + uncertainty[:, 1:2]

        # Clamp bounds to valid range
        lower_bound = torch.clamp(lower_bound, 0, 100)
        upper_bound = torch.clamp(upper_bound, 0, 100)

        return {
            'score': score,
            'confidence': confidence,
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'hidden': hidden,
        }

    def predict(self, x: torch.Tensor) -> dict:
        """
        Inference mode
        """
        self.eval()
        with torch.no_grad():
            return self.forward(x)


class ApneaRiskLSTM(nn.Module):
    """
    LSTM model for predicting sleep apnea risk
    Uses sleep events and demographic data
    """
    def __init__(
        self,
        sleep_features_dim: int = 10,
        demographic_dim: int = 5,
        hidden_dim: int = 128,
        num_layers: int = 3,
        dropout: float = 0.3,
        sequence_length: int = 60,  # 60 days of history
    ):
        super().__init__()

        self.sleep_features_dim = sleep_features_dim
        self.demographic_dim = demographic_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Feature embeddings
        self.sleep_embedding = nn.Linear(sleep_features_dim, hidden_dim // 2)
        self.demographic_embedding = nn.Linear(demographic_dim, hidden_dim // 2)

        # LSTM for temporal patterns
        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
        )

        # Attention mechanism
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=4,
            dropout=dropout,
            batch_first=True,
        )

        # Risk prediction head
        self.risk_predictor = nn.Sequential(
            nn.Linear(hidden_dim * 2, 128),  # *2 for concatenated features
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid(),  # Risk probability (0-1)
        )

    def forward(
        self,
        sleep_features: torch.Tensor,
        demographic_features: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            sleep_features: (batch, sequence_length, sleep_features_dim)
            demographic_features: (batch, demographic_dim)
        Returns:
            risk: (batch, 1) - Apnea risk probability
        """
        batch_size, seq_len, _ = sleep_features.size()

        # Embed sleep features
        sleep_emb = self.sleep_embedding(sleep_features)  # (batch, seq, hidden//2)

        # Embed demographic features and repeat for each timestep
        demo_emb = self.demographic_embedding(demographic_features)  # (batch, hidden//2)
        demo_emb = demo_emb.unsqueeze(1).repeat(1, seq_len, 1)  # (batch, seq, hidden//2)

        # Concatenate embeddings
        combined = torch.cat([sleep_emb, demo_emb], dim=-1)  # (batch, seq, hidden)

        # LSTM processing
        lstm_out, _ = self.lstm(combined)  # (batch, seq, hidden)

        # Apply attention
        attended, _ = self.attention(lstm_out, lstm_out, lstm_out)  # (batch, seq, hidden)

        # Global pooling: mean and max
        mean_pool = torch.mean(attended, dim=1)  # (batch, hidden)
        max_pool, _ = torch.max(attended, dim=1)  # (batch, hidden)
        pooled = torch.cat([mean_pool, max_pool], dim=-1)  # (batch, hidden*2)

        # Risk prediction
        risk = self.risk_predictor(pooled)  # (batch, 1)

        return risk


class CognitiveDeclineLSTM(nn.Module):
    """
    Multi-task LSTM for detecting early indicators of cognitive decline
    Analyzes sleep pattern trends over extended periods
    """
    def __init__(
        self,
        input_dim: int = 12,
        hidden_dim: int = 128,
        num_layers: int = 3,
        dropout: float = 0.3,
        sequence_length: int = 90,  # 90 days
    ):
        super().__init__()

        self.input_dim = input_dim
        self.hidden_dim = hidden_dim

        # Feature processing
        self.input_projection = nn.Linear(input_dim, hidden_dim)

        # Bidirectional LSTM for better context
        self.lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True,
        )

        lstm_output_dim = hidden_dim * 2  # Bidirectional

        # Multi-task heads
        self.risk_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
            nn.Sigmoid(),  # Risk score (0-1)
        )

        self.trend_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 3),  # Improving/Stable/Declining
        )

        self.confidence_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> dict:
        """
        Args:
            x: (batch, sequence_length, input_dim)
        Returns:
            dict with risk, trend, and confidence predictions
        """
        # Project input
        x = self.input_projection(x)

        # LSTM processing
        lstm_out, _ = self.lstm(x)

        # Use last hidden state
        last_hidden = lstm_out[:, -1, :]

        # Multi-task predictions
        risk = self.risk_head(last_hidden)
        trend_logits = self.trend_head(last_hidden)
        confidence = self.confidence_head(last_hidden)

        return {
            'risk': risk,
            'trend': F.softmax(trend_logits, dim=-1),
            'confidence': confidence,
        }


class BurnoutDetectionLSTM(nn.Module):
    """
    LSTM model for detecting burnout from sleep patterns
    Focuses on consistency, sleep debt, and recovery patterns
    """
    def __init__(
        self,
        input_dim: int = 10,
        hidden_dim: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
    ):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
        )

        # Attention for identifying critical periods
        self.attention_weights = nn.Linear(hidden_dim, 1)

        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 3),  # Low/Medium/High burnout risk
        )

    def forward(self, x: torch.Tensor) -> dict:
        """
        Args:
            x: (batch, sequence_length, input_dim)
        Returns:
            dict with burnout risk classification
        """
        # LSTM
        lstm_out, _ = self.lstm(x)  # (batch, seq, hidden)

        # Attention
        attention_scores = self.attention_weights(lstm_out)  # (batch, seq, 1)
        attention_weights = F.softmax(attention_scores, dim=1)

        # Weighted sum
        context = torch.sum(lstm_out * attention_weights, dim=1)  # (batch, hidden)

        # Classification
        logits = self.classifier(context)

        return {
            'burnout_risk': F.softmax(logits, dim=-1),
            'attention_weights': attention_weights.squeeze(-1),
        }


if __name__ == '__main__':
    # Test models
    print("Testing Sleep Quality LSTM...")
    model = SleepQualityLSTM()
    dummy_input = torch.randn(4, 30, 15)  # batch=4, seq=30 days, features=15
    output = model(dummy_input)
    print(f"Score shape: {output['score'].shape}")
    print(f"Confidence shape: {output['confidence'].shape}")

    print("\nTesting Apnea Risk LSTM...")
    apnea_model = ApneaRiskLSTM()
    sleep_data = torch.randn(4, 60, 10)
    demo_data = torch.randn(4, 5)
    risk = apnea_model(sleep_data, demo_data)
    print(f"Risk shape: {risk.shape}")

    print("\nTesting Cognitive Decline LSTM...")
    cognitive_model = CognitiveDeclineLSTM()
    cognitive_input = torch.randn(4, 90, 12)
    cognitive_output = cognitive_model(cognitive_input)
    print(f"Risk shape: {cognitive_output['risk'].shape}")
    print(f"Trend shape: {cognitive_output['trend'].shape}")

    print("\nTesting Burnout Detection LSTM...")
    burnout_model = BurnoutDetectionLSTM()
    burnout_input = torch.randn(4, 30, 10)
    burnout_output = burnout_model(burnout_input)
    print(f"Burnout risk shape: {burnout_output['burnout_risk'].shape}")
