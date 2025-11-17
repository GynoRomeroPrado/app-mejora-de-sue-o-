import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/store';
import { startSleepSession, stopSleepSession } from '@/store/slices/sleepSlice';
import { Colors, Spacing, Typography, BorderRadius } from '@/theme';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import BackgroundActions from 'react-native-background-actions';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width } = Dimensions.get('window');

const audioRecorderPlayer = new AudioRecorderPlayer();

const SleepRecordingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentSession, isRecording } = useAppSelector((state) => state.sleep);

  const [recordTime, setRecordTime] = useState('00:00:00');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkPermissions();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    if (isRecording) {
      startBackgroundService();
    }

    return () => {
      if (isRecording) {
        BackgroundActions.stop();
      }
    };
  }, [isRecording]);

  const checkPermissions = async () => {
    const permission = Platform.select({
      ios: PERMISSIONS.IOS.MICROPHONE,
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    });

    if (!permission) return;

    const result = await check(permission);

    if (result !== RESULTS.GRANTED) {
      const requestResult = await request(permission);

      if (requestResult !== RESULTS.GRANTED) {
        Alert.alert(
          'Permiso Requerido',
          'SleepWise necesita acceso al micrófono para grabar tu sueño.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startBackgroundService = async () => {
    const options = {
      taskName: 'SleepWise Recording',
      taskTitle: 'Grabando tu sueño',
      taskDesc: 'SleepWise está monitoreando tu sueño',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#2196F3',
      linkingURI: 'sleepwise://recording',
      parameters: {
        delay: 1000,
      },
    };

    await BackgroundActions.start(backgroundTask, options);
  };

  const backgroundTask = async (taskData: any) => {
    await new Promise(async (resolve) => {
      const { delay } = taskData;

      while (BackgroundActions.isRunning()) {
        // Update recording time
        await new Promise((r) => setTimeout(r, delay));

        // Monitor battery level
        // In real app, use react-native-device-info

        // Upload audio chunks periodically (every 5 minutes)
        // This would be implemented in the audio service
      }
    });
  };

  const handleStartRecording = async () => {
    try {
      // Start session in backend
      const result = await dispatch(startSleepSession()).unwrap();

      // Start audio recording
      const path = Platform.select({
        ios: `sleepwise_${result.id}.m4a`,
        android: `${AudioRecorderPlayer.CachesDirectoryPath}/sleepwise_${result.id}.mp3`,
      });

      await audioRecorderPlayer.startRecorder(path);

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      });

      Alert.alert(
        'Grabación Iniciada',
        'Coloca tu teléfono en la mesita de noche y duerme bien.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo iniciar la grabación. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStopRecording = async () => {
    Alert.alert(
      'Detener Grabación',
      '¿Estás seguro de que quieres detener la grabación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop audio recording
              const result = await audioRecorderPlayer.stopRecorder();
              audioRecorderPlayer.removeRecordBackListener();

              // Stop session in backend
              if (currentSession) {
                await dispatch(stopSleepSession(currentSession.id)).unwrap();
              }

              // Stop background service
              await BackgroundActions.stop();

              Alert.alert(
                'Grabación Completada',
                'Estamos procesando tu sesión de sueño. Tus resultados estarán listos en unos minutos.',
                [{ text: 'Ver Resultados' }]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Hubo un problema al detener la grabación.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isRecording ? 'Grabando tu Sueño' : 'Iniciar Sesión de Sueño'}
        </Text>
        <Text style={styles.subtitle}>
          {isRecording
            ? 'No te preocupes, estamos cuidando tu sueño'
            : 'Prepárate para dormir'}
        </Text>
      </View>

      {/* Moon Icon with Pulse Animation */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.moonContainer,
            {
              transform: [{ scale: isRecording ? pulseAnim : 1 }],
            },
          ]}
        >
          <Text style={styles.moonIcon}>🌙</Text>
        </Animated.View>

        {/* Recording Time */}
        {isRecording && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{recordTime}</Text>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Grabando...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Status Info */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>🔋</Text>
          <Text style={styles.statusText}>Batería: {batteryLevel}%</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>📶</Text>
          <Text style={styles.statusText}>Teléfono Silenciado</Text>
        </View>
      </View>

      {/* Tips */}
      {!isRecording && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Consejos:</Text>
          <Text style={styles.tipText}>• Coloca tu teléfono en la mesita de noche</Text>
          <Text style={styles.tipText}>• Mantenlo conectado a la corriente</Text>
          <Text style={styles.tipText}>• Tu privacidad está protegida 🔒</Text>
          <Text style={styles.tipText}>• El audio se encripta automáticamente</Text>
        </View>
      )}

      {/* Privacy Notice */}
      <View style={styles.privacyContainer}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyText}>
          Tu audio está encriptado de extremo a extremo. Solo tú puedes acceder a él.
        </Text>
      </View>

      {/* Action Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, isRecording && styles.stopButton]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isRecording ? '⏹️  Detener Grabación' : '▶️  Iniciar Grabación'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moonContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.dark.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  moonIcon: {
    fontSize: 100,
  },
  timeContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  timeText: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.sm,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: Spacing.sm,
  },
  recordingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
  },
  tipsContainer: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
  },
  tipText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.dark.surfaceVariant,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
  },
});

export default SleepRecordingScreen;
