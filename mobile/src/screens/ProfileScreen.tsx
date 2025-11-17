import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateProfile } from '../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    });

    if (result.assets && result.assets[0]) {
      setProfileImage(result.assets[0].uri || null);
    }
  };

  const handleSave = async () => {
    try {
      await dispatch(
        updateProfile({
          name,
          email,
          phone,
          dateOfBirth,
          gender,
          profileImage,
        })
      ).unwrap();

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setDateOfBirth(user?.dateOfBirth || '');
    setGender(user?.gender || '');
    setProfileImage(user?.profileImage || null);
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={isEditing ? handleSelectImage : undefined}
          disabled={!isEditing}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="account" size={60} color="#9CA3AF" />
            </View>
          )}
          {isEditing && (
            <View style={styles.cameraIcon}>
              <Icon name="camera" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.subscriptionBadge}>
          {user?.subscriptionTier || 'FREE'}
        </Text>
      </View>

      {/* Profile Form */}
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
            placeholder="Ingresa tu nombre"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={email}
            onChangeText={setEmail}
            editable={isEditing}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="tu@email.com"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={phone}
            onChangeText={setPhone}
            editable={isEditing}
            keyboardType="phone-pad"
            placeholder="+34 600 000 000"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            editable={isEditing}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Género</Text>
          <View style={styles.genderContainer}>
            {['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  gender === option && styles.genderOptionSelected,
                  !isEditing && styles.genderOptionDisabled,
                ]}
                onPress={() => isEditing && setGender(option)}
                disabled={!isEditing}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === option && styles.genderTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Estadísticas de la cuenta</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="moon-waning-crescent" size={24} color="#6366F1" />
              <Text style={styles.statValue}>{user?.totalSessions || 0}</Text>
              <Text style={styles.statLabel}>Sesiones</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="clock-outline" size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>
                {Math.round((user?.totalSleepHours || 0) / 60)}h
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="chart-line" size={24} color="#10B981" />
              <Text style={styles.statValue}>{user?.avgSleepScore || 0}</Text>
              <Text style={styles.statLabel}>Promedio</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="fire" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{user?.streakDays || 0}</Text>
              <Text style={styles.statLabel}>Racha</Text>
            </View>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.accountInfo}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Miembro desde</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('es-ES')
                : 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID de usuario</Text>
            <Text style={styles.infoValue}>{user?.id?.substring(0, 8)}...</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email verificado</Text>
            <View style={styles.verificationBadge}>
              <Icon
                name={user?.emailVerified ? 'check-circle' : 'close-circle'}
                size={16}
                color={user?.emailVerified ? '#10B981' : '#EF4444'}
              />
              <Text
                style={[
                  styles.verificationText,
                  user?.emailVerified ? styles.verified : styles.notVerified,
                ]}
              >
                {user?.emailVerified ? 'Verificado' : 'No verificado'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => setIsEditing(true)}
          >
            <Icon name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#6366F1',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6366F1',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366F1',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  subscriptionBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#6366F1',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  form: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  genderOptionSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  genderOptionDisabled: {
    opacity: 0.6,
  },
  genderText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  statsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  accountInfo: {
    marginTop: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verified: {
    color: '#10B981',
  },
  notVerified: {
    color: '#EF4444',
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#6366F1',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
