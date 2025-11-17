import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { register } from '../../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RegisterScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      await dispatch(register({ name, email, password })).unwrap();
    } catch (err) {
      Alert.alert('Error', error || 'Error al registrarse');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="moon-waning-crescent" size={48} color="#6366F1" />
        <Text style={styles.title}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>Únete a SleepWise hoy</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Icon name="account-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="email-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock-check-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeIcon: {
    padding: 8,
  },
  registerButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;
