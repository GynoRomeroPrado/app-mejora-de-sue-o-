"""
SleepWise Audio Analysis Model
CNN + BiLSTM + Attention architecture for sleep phase and event detection
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Dict


class AudioFeatureExtractor(nn.Module):
    """
    CNN-based feature extractor for audio spectrograms
    Extracts hierarchical features from Mel spectrograms
    """
    def __init__(self, n_mels: int = 128, hidden_dim: int = 256):
        super().__init__()

        # Convolutional layers
        self.conv1 = nn.Conv2d(1, 64, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(64)
        self.pool1 = nn.MaxPool2d(2, 2)

        self.conv2 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(128)
        self.pool2 = nn.MaxPool2d(2, 2)

        self.conv3 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(256)
        self.pool3 = nn.MaxPool2d(2, 2)

        self.conv4 = nn.Conv2d(256, 512, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(512)
        self.pool4 = nn.MaxPool2d(2, 2)

        self.dropout = nn.Dropout(0.3)

        # Calculate output dimension after convolutions
        self.output_dim = 512 * (n_mels // 16)  # 4 pooling layers, each /2

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, 1, n_mels, time_steps)
        Returns:
            features: (batch, time_steps, feature_dim)
        """
        # Conv block 1
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x)
        x = self.pool1(x)
        x = self.dropout(x)

        # Conv block 2
        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x)
        x = self.pool2(x)
        x = self.dropout(x)

        # Conv block 3
        x = self.conv3(x)
        x = self.bn3(x)
        x = F.relu(x)
        x = self.pool3(x)
        x = self.dropout(x)

        # Conv block 4
        x = self.conv4(x)
        x = self.bn4(x)
        x = F.relu(x)
        x = self.pool4(x)
        x = self.dropout(x)

        # Reshape: (batch, channels, freq, time) -> (batch, time, channels*freq)
        batch, channels, freq, time = x.size()
        x = x.permute(0, 3, 1, 2)  # (batch, time, channels, freq)
        x = x.reshape(batch, time, channels * freq)

        return x


class MultiHeadAttention(nn.Module):
    """
    Multi-head self-attention mechanism
    Helps model focus on important time segments
    """
    def __init__(self, hidden_dim: int, num_heads: int = 8):
        super().__init__()
        self.num_heads = num_heads
        self.hidden_dim = hidden_dim
        self.head_dim = hidden_dim // num_heads

        assert hidden_dim % num_heads == 0, "hidden_dim must be divisible by num_heads"

        self.query = nn.Linear(hidden_dim, hidden_dim)
        self.key = nn.Linear(hidden_dim, hidden_dim)
        self.value = nn.Linear(hidden_dim, hidden_dim)
        self.out = nn.Linear(hidden_dim, hidden_dim)

        self.dropout = nn.Dropout(0.1)

    def forward(self, x: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, hidden_dim)
            mask: (batch, seq_len) - optional
        Returns:
            output: (batch, seq_len, hidden_dim)
        """
        batch_size, seq_len, _ = x.size()

        # Linear projections
        Q = self.query(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        K = self.key(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        V = self.value(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)

        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / (self.head_dim ** 0.5)

        if mask is not None:
            scores = scores.masked_fill(mask.unsqueeze(1).unsqueeze(2) == 0, -1e9)

        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)

        # Apply attention to values
        context = torch.matmul(attention_weights, V)

        # Concatenate heads
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, self.hidden_dim)

        # Final linear projection
        output = self.out(context)

        return output


class SleepAnalysisModel(nn.Module):
    """
    Complete sleep analysis model
    Combines CNN, BiLSTM, and Attention for comprehensive sleep analysis
    """
    def __init__(
        self,
        n_mels: int = 128,
        cnn_hidden: int = 512,
        lstm_hidden: int = 256,
        num_lstm_layers: int = 2,
        num_attention_heads: int = 8,
        num_sleep_phases: int = 4,
        num_event_types: int = 5,
        num_severity_levels: int = 3,
    ):
        super().__init__()

        # Feature extraction
        self.feature_extractor = AudioFeatureExtractor(n_mels=n_mels, hidden_dim=cnn_hidden)

        # BiLSTM for temporal modeling
        self.lstm = nn.LSTM(
            input_size=self.feature_extractor.output_dim,
            hidden_size=lstm_hidden,
            num_layers=num_lstm_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.3 if num_lstm_layers > 1 else 0,
        )

        lstm_output_dim = lstm_hidden * 2  # Bidirectional

        # Attention
        self.attention = MultiHeadAttention(lstm_output_dim, num_attention_heads)

        # Layer normalization
        self.layer_norm = nn.LayerNorm(lstm_output_dim)

        # Output heads
        self.sleep_phase_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_sleep_phases),
        )

        self.event_detection_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_event_types),
        )

        self.severity_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_severity_levels),
        )

        self.confidence_head = nn.Sequential(
            nn.Linear(lstm_output_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, spectrogram: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            spectrogram: (batch, 1, n_mels, time_steps) - Mel spectrogram
        Returns:
            dict with:
                - sleep_phase: (batch, time_steps, num_sleep_phases)
                - event_detection: (batch, time_steps, num_event_types)
                - severity: (batch, time_steps, num_severity_levels)
                - confidence: (batch, time_steps, 1)
        """
        # Extract features from spectrogram
        features = self.feature_extractor(spectrogram)  # (batch, time, feature_dim)

        # Temporal modeling with BiLSTM
        lstm_out, _ = self.lstm(features)  # (batch, time, lstm_hidden*2)

        # Apply attention
        attended = self.attention(lstm_out)  # (batch, time, lstm_hidden*2)

        # Residual connection + layer norm
        attended = self.layer_norm(attended + lstm_out)

        # Multiple output heads
        sleep_phase_logits = self.sleep_phase_head(attended)
        event_logits = self.event_detection_head(attended)
        severity_logits = self.severity_head(attended)
        confidence = self.confidence_head(attended)

        return {
            'sleep_phase': sleep_phase_logits,
            'event_detection': event_logits,
            'severity': severity_logits,
            'confidence': confidence,
        }

    def predict(self, spectrogram: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Inference mode with softmax applied
        """
        self.eval()
        with torch.no_grad():
            outputs = self.forward(spectrogram)

            return {
                'sleep_phase': F.softmax(outputs['sleep_phase'], dim=-1),
                'event_detection': torch.sigmoid(outputs['event_detection']),  # Multi-label
                'severity': F.softmax(outputs['severity'], dim=-1),
                'confidence': outputs['confidence'],
            }


class SleepAnalysisLoss(nn.Module):
    """
    Multi-task loss function for sleep analysis
    Combines losses from all output heads with appropriate weights
    """
    def __init__(
        self,
        phase_weight: float = 1.0,
        event_weight: float = 1.0,
        severity_weight: float = 0.5,
        confidence_weight: float = 0.3,
    ):
        super().__init__()
        self.phase_weight = phase_weight
        self.event_weight = event_weight
        self.severity_weight = severity_weight
        self.confidence_weight = confidence_weight

        # Focal loss for imbalanced classes
        self.phase_loss = FocalLoss(alpha=0.25, gamma=2.0)
        self.event_loss = nn.BCEWithLogitsLoss()  # Multi-label
        self.severity_loss = nn.CrossEntropyLoss()
        self.confidence_loss = nn.MSELoss()

    def forward(
        self,
        predictions: Dict[str, torch.Tensor],
        targets: Dict[str, torch.Tensor],
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        """
        Calculate combined loss
        """
        # Individual losses
        phase_loss = self.phase_loss(
            predictions['sleep_phase'].reshape(-1, predictions['sleep_phase'].size(-1)),
            targets['sleep_phase'].reshape(-1)
        )

        event_loss = self.event_loss(
            predictions['event_detection'],
            targets['event_detection']
        )

        severity_loss = self.severity_loss(
            predictions['severity'].reshape(-1, predictions['severity'].size(-1)),
            targets['severity'].reshape(-1)
        )

        confidence_loss = self.confidence_loss(
            predictions['confidence'],
            targets['confidence']
        )

        # Combined loss
        total_loss = (
            self.phase_weight * phase_loss +
            self.event_weight * event_loss +
            self.severity_weight * severity_loss +
            self.confidence_weight * confidence_loss
        )

        loss_dict = {
            'total': total_loss.item(),
            'phase': phase_loss.item(),
            'event': event_loss.item(),
            'severity': severity_loss.item(),
            'confidence': confidence_loss.item(),
        }

        return total_loss, loss_dict


class FocalLoss(nn.Module):
    """
    Focal Loss for addressing class imbalance
    https://arxiv.org/abs/1708.02002
    """
    def __init__(self, alpha: float = 0.25, gamma: float = 2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        p_t = torch.exp(-ce_loss)
        focal_loss = self.alpha * (1 - p_t) ** self.gamma * ce_loss
        return focal_loss.mean()


def create_model(config: dict = None) -> SleepAnalysisModel:
    """
    Factory function to create model with configuration
    """
    if config is None:
        config = {
            'n_mels': 128,
            'cnn_hidden': 512,
            'lstm_hidden': 256,
            'num_lstm_layers': 2,
            'num_attention_heads': 8,
        }

    return SleepAnalysisModel(**config)


if __name__ == '__main__':
    # Test model
    model = create_model()

    # Dummy input: 5-minute audio @ 16kHz = 300 seconds
    # With window size 0.025s and hop 0.01s: ~30000 frames
    # After pooling: ~1875 time steps
    dummy_spectrogram = torch.randn(2, 1, 128, 1875)  # (batch, channel, freq, time)

    outputs = model(dummy_spectrogram)

    print("Model Output Shapes:")
    for key, value in outputs.items():
        print(f"{key}: {value.shape}")

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
