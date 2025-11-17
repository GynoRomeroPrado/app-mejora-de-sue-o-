"""
Audio preprocessing for sleep analysis
Extracts features from raw audio for model inference
"""

import numpy as np
import torch
import librosa
import scipy.signal as signal
from typing import Tuple, Optional, Dict
import warnings
warnings.filterwarnings('ignore')


class AudioPreprocessor:
    """
    Preprocesses raw audio for sleep analysis model
    """
    def __init__(
        self,
        sample_rate: int = 16000,
        n_mels: int = 128,
        n_mfcc: int = 40,
        n_fft: int = 2048,
        hop_length: int = 512,
        window_size: float = 0.025,  # seconds
        hop_size: float = 0.010,  # seconds
    ):
        self.sample_rate = sample_rate
        self.n_mels = n_mels
        self.n_mfcc = n_mfcc
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.window_size = window_size
        self.hop_size = hop_size

    def load_audio(
        self,
        audio_path: str,
        target_sr: Optional[int] = None
    ) -> np.ndarray:
        """
        Load audio file and resample if necessary

        Args:
            audio_path: Path to audio file
            target_sr: Target sample rate (uses self.sample_rate if None)

        Returns:
            Audio waveform as numpy array
        """
        target_sr = target_sr or self.sample_rate

        # Load audio
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)

        return audio

    def normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        """
        Normalize audio to [-1, 1] range

        Args:
            audio: Raw audio waveform

        Returns:
            Normalized audio
        """
        if np.abs(audio).max() == 0:
            return audio

        return audio / np.abs(audio).max()

    def remove_silence(
        self,
        audio: np.ndarray,
        top_db: int = 20,
        frame_length: int = 2048,
        hop_length: int = 512
    ) -> np.ndarray:
        """
        Remove silent portions from audio

        Args:
            audio: Audio waveform
            top_db: Threshold (in dB) below reference to consider as silence
            frame_length: Frame length for silence detection
            hop_length: Hop length for silence detection

        Returns:
            Audio with silence removed
        """
        # Get non-silent intervals
        intervals = librosa.effects.split(
            audio,
            top_db=top_db,
            frame_length=frame_length,
            hop_length=hop_length
        )

        # Concatenate non-silent intervals
        if len(intervals) == 0:
            return audio

        audio_trimmed = np.concatenate([
            audio[start:end] for start, end in intervals
        ])

        return audio_trimmed

    def apply_bandpass_filter(
        self,
        audio: np.ndarray,
        lowcut: float = 100.0,
        highcut: float = 8000.0,
        order: int = 5
    ) -> np.ndarray:
        """
        Apply bandpass filter to focus on relevant frequencies

        Args:
            audio: Audio waveform
            lowcut: Low cutoff frequency (Hz)
            highcut: High cutoff frequency (Hz)
            order: Filter order

        Returns:
            Filtered audio
        """
        nyquist = self.sample_rate / 2
        low = lowcut / nyquist
        high = highcut / nyquist

        # Design Butterworth filter
        b, a = signal.butter(order, [low, high], btype='band')

        # Apply filter
        filtered_audio = signal.filtfilt(b, a, audio)

        return filtered_audio

    def extract_mel_spectrogram(
        self,
        audio: np.ndarray,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Extract mel spectrogram from audio

        Args:
            audio: Audio waveform
            normalize: Whether to normalize spectrogram

        Returns:
            Mel spectrogram (n_mels, time_steps)
        """
        # Compute mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=audio,
            sr=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            n_mels=self.n_mels,
            fmax=8000  # Focus on speech/sleep sound frequencies
        )

        # Convert to log scale (dB)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        if normalize:
            # Normalize to [0, 1]
            mel_spec_db = (mel_spec_db - mel_spec_db.min()) / (mel_spec_db.max() - mel_spec_db.min() + 1e-8)

        return mel_spec_db

    def extract_mfcc(
        self,
        audio: np.ndarray,
        include_delta: bool = True,
        include_delta2: bool = True
    ) -> np.ndarray:
        """
        Extract MFCC features

        Args:
            audio: Audio waveform
            include_delta: Include delta (first derivative) features
            include_delta2: Include delta-delta (second derivative) features

        Returns:
            MFCC features (n_features, time_steps)
        """
        # Extract MFCCs
        mfccs = librosa.feature.mfcc(
            y=audio,
            sr=self.sample_rate,
            n_mfcc=self.n_mfcc,
            n_fft=self.n_fft,
            hop_length=self.hop_length
        )

        features = [mfccs]

        if include_delta:
            # First derivative
            delta = librosa.feature.delta(mfccs)
            features.append(delta)

        if include_delta2:
            # Second derivative
            delta2 = librosa.feature.delta(mfccs, order=2)
            features.append(delta2)

        # Concatenate all features
        all_features = np.concatenate(features, axis=0)

        return all_features

    def extract_spectral_features(self, audio: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Extract various spectral features

        Args:
            audio: Audio waveform

        Returns:
            Dictionary of spectral features
        """
        features = {}

        # Spectral centroid (brightness)
        features['spectral_centroid'] = librosa.feature.spectral_centroid(
            y=audio,
            sr=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length
        )[0]

        # Spectral rolloff (frequency below which 85% of energy is contained)
        features['spectral_rolloff'] = librosa.feature.spectral_rolloff(
            y=audio,
            sr=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            roll_percent=0.85
        )[0]

        # Spectral bandwidth
        features['spectral_bandwidth'] = librosa.feature.spectral_bandwidth(
            y=audio,
            sr=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length
        )[0]

        # Zero crossing rate (useful for detecting snoring)
        features['zero_crossing_rate'] = librosa.feature.zero_crossing_rate(
            audio,
            frame_length=self.n_fft,
            hop_length=self.hop_length
        )[0]

        return features

    def chunk_audio(
        self,
        audio: np.ndarray,
        chunk_duration: float = 300.0  # 5 minutes in seconds
    ) -> list:
        """
        Split audio into chunks for processing

        Args:
            audio: Audio waveform
            chunk_duration: Duration of each chunk in seconds

        Returns:
            List of audio chunks
        """
        chunk_samples = int(chunk_duration * self.sample_rate)
        num_chunks = int(np.ceil(len(audio) / chunk_samples))

        chunks = []
        for i in range(num_chunks):
            start = i * chunk_samples
            end = min((i + 1) * chunk_samples, len(audio))
            chunk = audio[start:end]

            # Pad last chunk if necessary
            if len(chunk) < chunk_samples:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), mode='constant')

            chunks.append(chunk)

        return chunks

    def prepare_for_model(
        self,
        audio_path: str,
        preprocess: bool = True
    ) -> torch.Tensor:
        """
        Complete preprocessing pipeline for model input

        Args:
            audio_path: Path to audio file
            preprocess: Whether to apply preprocessing (normalization, filtering, etc.)

        Returns:
            Preprocessed audio as torch tensor (1, 1, n_mels, time_steps)
        """
        # Load audio
        audio = self.load_audio(audio_path)

        if preprocess:
            # Normalize
            audio = self.normalize_audio(audio)

            # Apply bandpass filter
            audio = self.apply_bandpass_filter(audio)

            # Note: Not removing silence for sleep analysis
            # as silence is meaningful

        # Extract mel spectrogram
        mel_spec = self.extract_mel_spectrogram(audio)

        # Convert to tensor and add batch + channel dimensions
        mel_spec_tensor = torch.from_numpy(mel_spec).float()
        mel_spec_tensor = mel_spec_tensor.unsqueeze(0).unsqueeze(0)  # (1, 1, n_mels, time)

        return mel_spec_tensor

    def extract_all_features(
        self,
        audio_path: str
    ) -> Dict[str, np.ndarray]:
        """
        Extract all available features

        Args:
            audio_path: Path to audio file

        Returns:
            Dictionary of all extracted features
        """
        # Load audio
        audio = self.load_audio(audio_path)

        # Normalize
        audio = self.normalize_audio(audio)

        # Apply filter
        audio = self.apply_bandpass_filter(audio)

        features = {}

        # Mel spectrogram
        features['mel_spectrogram'] = self.extract_mel_spectrogram(audio)

        # MFCCs
        features['mfcc'] = self.extract_mfcc(audio)

        # Spectral features
        spectral_features = self.extract_spectral_features(audio)
        features.update(spectral_features)

        return features


def test_preprocessing():
    """
    Test preprocessing pipeline
    """
    print("Testing audio preprocessing...")

    # Create preprocessor
    preprocessor = AudioPreprocessor()

    # Generate dummy audio (1 minute @ 16kHz)
    dummy_audio = np.random.randn(60 * 16000)

    # Test normalization
    normalized = preprocessor.normalize_audio(dummy_audio)
    assert normalized.max() <= 1.0 and normalized.min() >= -1.0
    print("✓ Normalization works")

    # Test filtering
    filtered = preprocessor.apply_bandpass_filter(dummy_audio)
    assert filtered.shape == dummy_audio.shape
    print("✓ Bandpass filter works")

    # Test mel spectrogram extraction
    mel_spec = preprocessor.extract_mel_spectrogram(dummy_audio)
    assert mel_spec.shape[0] == preprocessor.n_mels
    print(f"✓ Mel spectrogram shape: {mel_spec.shape}")

    # Test MFCC extraction
    mfcc = preprocessor.extract_mfcc(dummy_audio)
    assert mfcc.shape[0] == preprocessor.n_mfcc * 3  # MFCC + delta + delta2
    print(f"✓ MFCC shape: {mfcc.shape}")

    # Test chunking
    chunks = preprocessor.chunk_audio(dummy_audio, chunk_duration=30.0)
    assert len(chunks) == 2  # 60 seconds / 30 seconds
    print(f"✓ Audio chunking: {len(chunks)} chunks")

    print("\nAll preprocessing tests passed! ✓")


if __name__ == '__main__':
    test_preprocessing()
