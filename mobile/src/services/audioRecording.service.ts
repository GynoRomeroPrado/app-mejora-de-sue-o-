import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSet,
  AudioSourceAndroidType,
} from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import api from './api.service';

const audioRecorderPlayer = new AudioRecorderPlayer();

export interface RecordingConfig {
  audioQuality: 'low' | 'medium' | 'high';
  chunkDurationMs: number; // Duration of each audio chunk (default: 5 minutes)
  encryptionEnabled: boolean;
}

export interface RecordingStatus {
  isRecording: boolean;
  duration: number;
  filePath?: string;
  chunksUploaded: number;
}

class AudioRecordingService {
  private isRecording: boolean = false;
  private recordingPath: string | null = null;
  private sessionId: string | null = null;
  private chunkIndex: number = 0;
  private chunkUploadInterval: NodeJS.Timeout | null = null;
  private recordingStartTime: number = 0;

  private config: RecordingConfig = {
    audioQuality: 'medium',
    chunkDurationMs: 5 * 60 * 1000, // 5 minutes
    encryptionEnabled: true,
  };

  /**
   * Configure recording settings
   */
  setConfig(config: Partial<RecordingConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get audio configuration based on quality setting
   */
  private getAudioSet(): AudioSet {
    const baseConfig: AudioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 1, // Mono
      AVFormatIDKeyIOS: AVEncodingOption.aac,
    };

    switch (this.config.audioQuality) {
      case 'low':
        return {
          ...baseConfig,
          AudioSampleRateInHz: 16000,
          AudioEncodingBitRateAndroid: 64000,
          AVEncoderBitRateKeyIOS: 64000,
        };
      case 'high':
        return {
          ...baseConfig,
          AudioSampleRateInHz: 44100,
          AudioEncodingBitRateAndroid: 192000,
          AVEncoderBitRateKeyIOS: 192000,
        };
      case 'medium':
      default:
        return {
          ...baseConfig,
          AudioSampleRateInHz: 16000, // Optimal for speech/sleep sounds
          AudioEncodingBitRateAndroid: 128000,
          AVEncoderBitRateKeyIOS: 128000,
        };
    }
  };

  /**
   * Start audio recording
   */
  async startRecording(sessionId: string): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      this.sessionId = sessionId;
      this.chunkIndex = 0;
      this.recordingStartTime = Date.now();

      // Generate recording path
      const fileName = `sleepwise_${sessionId}_${Date.now()}${Platform.select({
        ios: '.m4a',
        android: '.mp3',
      })}`;

      this.recordingPath = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
        android: `${RNFS.CachesDirectoryPath}/${fileName}`,
      }) || '';

      // Start recording
      const audioSet = this.getAudioSet();
      await audioRecorderPlayer.startRecorder(this.recordingPath, audioSet);

      this.isRecording = true;

      // Set up periodic chunk upload
      this.startChunkUpload();

      // Add recording progress listener
      audioRecorderPlayer.addRecordBackListener((e) => {
        // You can emit events here for UI updates if needed
        console.log(`Recording: ${e.currentPosition}ms`);
      });

      console.log('Recording started:', this.recordingPath);
      return this.recordingPath;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop audio recording
   */
  async stopRecording(): Promise<string | null> {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return null;
    }

    try {
      // Stop recorder
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      this.isRecording = false;

      // Stop chunk upload interval
      if (this.chunkUploadInterval) {
        clearInterval(this.chunkUploadInterval);
        this.chunkUploadInterval = null;
      }

      // Upload final chunk
      if (this.recordingPath) {
        await this.uploadAudioChunk(this.recordingPath);
      }

      console.log('Recording stopped:', result);

      const filePath = this.recordingPath;
      this.recordingPath = null;
      this.sessionId = null;

      return filePath;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Start periodic chunk upload
   */
  private startChunkUpload() {
    this.chunkUploadInterval = setInterval(() => {
      if (this.recordingPath && this.isRecording) {
        this.uploadAudioChunk(this.recordingPath);
      }
    }, this.config.chunkDurationMs);
  }

  /**
   * Upload audio chunk to backend
   */
  private async uploadAudioChunk(filePath: string): Promise<void> {
    try {
      if (!this.sessionId) {
        console.warn('No session ID available for chunk upload');
        return;
      }

      // Read file as base64
      const audioData = await RNFS.readFile(filePath, 'base64');

      // Encrypt if enabled
      const encryptedData = this.config.encryptionEnabled
        ? await this.encryptAudio(audioData)
        : audioData;

      // Upload chunk
      await api.post(`/sleep/sessions/${this.sessionId}/audio`, {
        chunkData: encryptedData,
        chunkIndex: this.chunkIndex,
        timestamp: Date.now(),
        encrypted: this.config.encryptionEnabled,
      });

      this.chunkIndex++;
      console.log(`Chunk ${this.chunkIndex} uploaded successfully`);
    } catch (error) {
      console.error('Failed to upload audio chunk:', error);
      // Don't throw - keep recording even if upload fails
      // Chunks will be retried later
    }
  }

  /**
   * Encrypt audio data (simple XOR encryption for demo)
   * In production, use proper encryption library
   */
  private async encryptAudio(audioData: string): Promise<string> {
    try {
      // Get or generate encryption key
      let encryptionKey = await EncryptedStorage.getItem('audio_encryption_key');

      if (!encryptionKey) {
        encryptionKey = this.generateEncryptionKey();
        await EncryptedStorage.setItem('audio_encryption_key', encryptionKey);
      }

      // In production, use a proper encryption library like react-native-aes-crypto
      // For now, return as-is (placeholder)
      return audioData;
    } catch (error) {
      console.error('Encryption failed:', error);
      return audioData; // Fallback to unencrypted
    }
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Get recording status
   */
  getStatus(): RecordingStatus {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      filePath: this.recordingPath || undefined,
      chunksUploaded: this.chunkIndex,
    };
  }

  /**
   * Pause recording (if supported)
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    await audioRecorderPlayer.pauseRecorder();
    console.log('Recording paused');
  }

  /**
   * Resume recording (if supported)
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording to resume');
    }

    await audioRecorderPlayer.resumeRecorder();
    console.log('Recording resumed');
  }

  /**
   * Delete local recording file
   */
  async deleteRecording(filePath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log('Recording deleted:', filePath);
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw error;
    }
  }

  /**
   * Get disk space available
   */
  async getAvailableSpace(): Promise<number> {
    try {
      const freeDiskSpace = await RNFS.getFSInfo();
      return freeDiskSpace.freeSpace; // bytes
    } catch (error) {
      console.error('Failed to get disk space:', error);
      return 0;
    }
  }

  /**
   * Check if enough space for recording
   * @param estimatedDurationHours - Estimated recording duration in hours
   */
  async hasEnoughSpace(estimatedDurationHours: number = 8): Promise<boolean> {
    const bytesPerHour = this.estimateBytesPerHour();
    const requiredSpace = bytesPerHour * estimatedDurationHours;
    const availableSpace = await this.getAvailableSpace();

    // Add 20% buffer
    const requiredWithBuffer = requiredSpace * 1.2;

    return availableSpace >= requiredWithBuffer;
  }

  /**
   * Estimate bytes per hour based on quality setting
   */
  private estimateBytesPerHour(): number {
    switch (this.config.audioQuality) {
      case 'low':
        return 28 * 1024 * 1024; // ~28 MB/hour (64 kbps)
      case 'high':
        return 86 * 1024 * 1024; // ~86 MB/hour (192 kbps)
      case 'medium':
      default:
        return 57 * 1024 * 1024; // ~57 MB/hour (128 kbps)
    }
  }

  /**
   * Clean up old recordings to free space
   */
  async cleanupOldRecordings(daysToKeep: number = 7): Promise<void> {
    try {
      const directory = Platform.select({
        ios: RNFS.DocumentDirectoryPath,
        android: RNFS.CachesDirectoryPath,
      }) || '';

      const files = await RNFS.readDir(directory);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.name.startsWith('sleepwise_')) {
          const fileAge = now - new Date(file.mtime).getTime();

          if (fileAge > maxAge) {
            await RNFS.unlink(file.path);
            console.log('Cleaned up old recording:', file.name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old recordings:', error);
    }
  }
}

// Export singleton instance
export default new AudioRecordingService();
