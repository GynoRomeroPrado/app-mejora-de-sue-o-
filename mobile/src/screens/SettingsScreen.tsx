import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateSettings, logout } from '../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  destructive?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  destructive = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            destructive && styles.iconContainerDestructive,
          ]}
        >
          <Icon
            name={icon}
            size={20}
            color={destructive ? '#EF4444' : '#6366F1'}
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
            {title}
          </Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && onPress && (
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, settings } = useAppSelector((state) => state.auth);

  // Notification settings
  const [sleepReminders, setSleepReminders] = useState(
    settings?.sleepReminders ?? true
  );
  const [wakeupAlarm, setWakeupAlarm] = useState(settings?.wakeupAlarm ?? true);
  const [insightNotifications, setInsightNotifications] = useState(
    settings?.insightNotifications ?? true
  );
  const [familyAlerts, setFamilyAlerts] = useState(
    settings?.familyAlerts ?? true
  );

  // Privacy settings
  const [shareWithFamily, setShareWithFamily] = useState(
    settings?.shareWithFamily ?? true
  );
  const [anonymousAnalytics, setAnonymousAnalytics] = useState(
    settings?.anonymousAnalytics ?? true
  );

  // Recording settings
  const [audioQuality, setAudioQuality] = useState(settings?.audioQuality ?? 'high');
  const [autoStopRecording, setAutoStopRecording] = useState(
    settings?.autoStopRecording ?? true
  );
  const [batteryOptimization, setBatteryOptimization] = useState(
    settings?.batteryOptimization ?? true
  );

  // Dark mode
  const [darkMode, setDarkMode] = useState(settings?.darkMode ?? false);

  const handleSaveSettings = async () => {
    try {
      await dispatch(
        updateSettings({
          sleepReminders,
          wakeupAlarm,
          insightNotifications,
          familyAlerts,
          shareWithFamily,
          anonymousAnalytics,
          audioQuality,
          autoStopRecording,
          batteryOptimization,
          darkMode,
        })
      ).unwrap();

      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Implement account deletion
            Alert.alert('Info', 'Contacta con soporte para eliminar tu cuenta');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Exportar datos',
      'Se enviará un archivo con todos tus datos a tu correo electrónico',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: async () => {
            // Implement data export
            Alert.alert('Éxito', 'Recibirás un correo con tus datos en breve');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="account" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>

        <SettingItem
          icon="bell-outline"
          title="Recordatorios de sueño"
          subtitle="Te recordamos ir a dormir a tu hora"
          rightElement={
            <Switch
              value={sleepReminders}
              onValueChange={setSleepReminders}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={sleepReminders ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="alarm"
          title="Alarma de despertar"
          subtitle="Despierta con análisis de sueño"
          rightElement={
            <Switch
              value={wakeupAlarm}
              onValueChange={setWakeupAlarm}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={wakeupAlarm ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="lightbulb-outline"
          title="Insights y recomendaciones"
          subtitle="Recibe consejos personalizados"
          rightElement={
            <Switch
              value={insightNotifications}
              onValueChange={setInsightNotifications}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={insightNotifications ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="account-group"
          title="Alertas familiares"
          subtitle="Notificaciones de tu grupo familiar"
          rightElement={
            <Switch
              value={familyAlerts}
              onValueChange={setFamilyAlerts}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={familyAlerts ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad</Text>

        <SettingItem
          icon="shield-account"
          title="Compartir con familia"
          subtitle="Los miembros pueden ver tus datos"
          rightElement={
            <Switch
              value={shareWithFamily}
              onValueChange={setShareWithFamily}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={shareWithFamily ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="chart-box-outline"
          title="Analytics anónimos"
          subtitle="Ayuda a mejorar la app"
          rightElement={
            <Switch
              value={anonymousAnalytics}
              onValueChange={setAnonymousAnalytics}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={anonymousAnalytics ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="file-document-outline"
          title="Política de privacidad"
          onPress={() => {
            // Navigate to privacy policy
          }}
        />

        <SettingItem
          icon="file-check-outline"
          title="Términos de servicio"
          onPress={() => {
            // Navigate to terms
          }}
        />
      </View>

      {/* Recording Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grabación</Text>

        <SettingItem
          icon="quality-high"
          title="Calidad de audio"
          subtitle={audioQuality === 'high' ? 'Alta' : 'Estándar'}
          onPress={() => {
            Alert.alert(
              'Calidad de audio',
              'Elige la calidad de grabación',
              [
                {
                  text: 'Estándar',
                  onPress: () => setAudioQuality('standard'),
                },
                {
                  text: 'Alta',
                  onPress: () => setAudioQuality('high'),
                },
              ]
            );
          }}
        />

        <SettingItem
          icon="stop-circle-outline"
          title="Detención automática"
          subtitle="Detiene la grabación al despertar"
          rightElement={
            <Switch
              value={autoStopRecording}
              onValueChange={setAutoStopRecording}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={autoStopRecording ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />

        <SettingItem
          icon="battery-charging"
          title="Optimización de batería"
          subtitle="Reduce consumo durante la noche"
          rightElement={
            <Switch
              value={batteryOptimization}
              onValueChange={setBatteryOptimization}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={batteryOptimization ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apariencia</Text>

        <SettingItem
          icon="theme-light-dark"
          title="Modo oscuro"
          subtitle="Tema oscuro para la app"
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
              thumbColor={darkMode ? '#6366F1' : '#F3F4F6'}
            />
          }
          showArrow={false}
        />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>

        <SettingItem
          icon="card-account-details"
          title="Suscripción"
          subtitle={`Plan ${user?.subscriptionTier || 'FREE'}`}
          onPress={() => {
            navigation.navigate('Subscription' as never);
          }}
        />

        <SettingItem
          icon="download-outline"
          title="Exportar mis datos"
          subtitle="Descarga todos tus datos"
          onPress={handleExportData}
        />

        <SettingItem
          icon="lock-reset"
          title="Cambiar contraseña"
          onPress={() => {
            // Navigate to change password
          }}
        />
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>

        <SettingItem
          icon="information-outline"
          title="Versión de la app"
          subtitle="1.0.0"
          showArrow={false}
        />

        <SettingItem
          icon="help-circle-outline"
          title="Centro de ayuda"
          onPress={() => {
            // Navigate to help center
          }}
        />

        <SettingItem
          icon="email-outline"
          title="Contactar soporte"
          onPress={() => {
            // Open email or support chat
          }}
        />
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zona de peligro</Text>

        <SettingItem
          icon="logout"
          title="Cerrar sesión"
          onPress={handleLogout}
          destructive
          showArrow={false}
        />

        <SettingItem
          icon="delete-forever"
          title="Eliminar cuenta"
          subtitle="Esta acción es irreversible"
          onPress={handleDeleteAccount}
          destructive
          showArrow={false}
        />
      </View>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Icon name="content-save" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 SleepWise. Todos los derechos reservados.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDestructive: {
    backgroundColor: '#FEE2E2',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  destructiveText: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveContainer: {
    padding: 16,
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default SettingsScreen;
