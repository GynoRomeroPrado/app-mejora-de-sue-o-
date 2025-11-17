import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Tuple

class SleepQualityLSTM(nn.Module):
    def __init__(self, input_size: int = 20, hidden_size: int = 128, num_layers: int = 2):
        super(SleepQualityLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers,
                           batch_first=True, dropout=0.3)
        self.fc_layers = nn.Sequential(nn.Linear(hidden_size, 64), nn.ReLU(), nn.Dropout(0.3),
                                      nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1), nn.Sigmoid())
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        return self.fc_layers(lstm_out[:, -1, :]) * 100

class ApneaRiskLSTM(nn.Module):
    def __init__(self, input_size: int = 15, hidden_size: int = 128, num_layers: int = 2):
        super(ApneaRiskLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers,
                           batch_first=True, dropout=0.3, bidirectional=True)
        self.risk_head = nn.Sequential(nn.Linear(hidden_size * 2, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid())
        self.severity_head = nn.Sequential(nn.Linear(hidden_size * 2, 64), nn.ReLU(), nn.Linear(64, 4), nn.Softmax(dim=1))
    
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        return self.risk_head(last_hidden) * 100, self.severity_head(last_hidden)

class BurnoutPredictionLSTM(nn.Module):
    def __init__(self, input_size: int = 18, hidden_size: int = 128, num_layers: int = 3):
        super(BurnoutPredictionLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers,
                           batch_first=True, dropout=0.4)
        self.attention = nn.Linear(hidden_size, 1)
        self.risk_predictor = nn.Sequential(nn.Linear(hidden_size, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid())
        self.trend_predictor = nn.Sequential(nn.Linear(hidden_size, 32), nn.ReLU(), nn.Linear(32, 3), nn.Softmax(dim=1))
    
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        lstm_out, _ = self.lstm(x)
        attention_weights = torch.softmax(self.attention(lstm_out), dim=1)
        context = torch.sum(attention_weights * lstm_out, dim=1)
        return self.risk_predictor(context) * 100, self.trend_predictor(context)

class PredictionEnsemble:
    def __init__(self, device: str = 'cpu'):
        self.device = device
        self.models = {
            'sleep_quality': SleepQualityLSTM().to(device),
            'apnea_risk': ApneaRiskLSTM().to(device),
            'burnout_risk': BurnoutPredictionLSTM().to(device),
        }
    
    def predict_all(self, features: Dict[str, np.ndarray]) -> Dict:
        results = {}
        with torch.no_grad():
            if 'sleep_quality_features' in features:
                x = torch.FloatTensor(features['sleep_quality_features']).unsqueeze(0).to(self.device)
                quality_score = self.models['sleep_quality'](x)
                results['sleep_quality'] = {'score': quality_score.item()}
            
            if 'apnea_features' in features:
                x = torch.FloatTensor(features['apnea_features']).unsqueeze(0).to(self.device)
                risk_score, severity = self.models['apnea_risk'](x)
                severity_labels = ['None', 'Mild', 'Moderate', 'Severe']
                results['apnea_risk'] = {
                    'risk_score': risk_score.item(),
                    'severity': severity_labels[torch.argmax(severity).item()]
                }
            
            if 'burnout_features' in features:
                x = torch.FloatTensor(features['burnout_features']).unsqueeze(0).to(self.device)
                risk_score, trend = self.models['burnout_risk'](x)
                trend_labels = ['Improving', 'Stable', 'Worsening']
                results['burnout_risk'] = {
                    'risk_score': risk_score.item(),
                    'trend': trend_labels[torch.argmax(trend).item()]
                }
        return results
