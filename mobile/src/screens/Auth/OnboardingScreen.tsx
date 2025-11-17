import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const OnboardingScreen: React.FC = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon name="moon-waning-crescent" size={120} color="#6366F1" />
        <Text style={styles.title}>Bienvenido a SleepWise</Text>
        <Text style={styles.description}>
          Mejora tu sueño con análisis de IA, predicciones personalizadas y monitoreo familiar
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Icon name="microphone" size={32} color="#8B5CF6" />
            <Text style={styles.featureTitle}>Análisis de Audio</Text>
            <Text style={styles.featureText}>
              Grabación y análisis inteligente de tus patrones de sueño
            </Text>
          </View>

          <View style={styles.feature}>
            <Icon name="brain" size={32} color="#6366F1" />
            <Text style={styles.featureTitle}>IA Predictiva</Text>
            <Text style={styles.featureText}>
              Predicciones personalizadas de calidad de sueño y salud
            </Text>
          </View>

          <View style={styles.feature}>
            <Icon name="account-group" size={32} color="#10B981" />
            <Text style={styles.featureTitle}>Monitoreo Familiar</Text>
            <Text style={styles.featureText}>
              Cuida el sueño de toda tu familia desde una sola app
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.primaryButtonText}>Comenzar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginTop: 48,
    gap: 32,
  },
  feature: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OnboardingScreen;
