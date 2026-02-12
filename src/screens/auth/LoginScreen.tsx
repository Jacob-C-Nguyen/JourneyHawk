// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';

type RootStackParamList = {
  Login: { role: string };
  SignUp: { role: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const { login, error } = useAuth();
  
  const [emailOrUsername, setEmailOrUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const isHost = role === 'host';
  const roleLabel = isHost ? 'Host / Chaperone' : 'Attendee';
  const roleEmoji = isHost ? '🛡️' : '👤';

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await login({ emailOrUsername, password }, role);
    setIsLoading(false);

    if (result.success) {
      // Navigation handled by AppNavigator
    } else {
      Alert.alert('Login Failed', result.error || 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Header background wraps back button + header */}
        <View style={styles.headerBackground}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <View style={[styles.roleChip, isHost && styles.roleChipHost]}>
              <Text style={styles.roleChipEmoji}>{roleEmoji}</Text>
              <Text style={styles.roleChipText}>{roleLabel}</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your {roleLabel.toLowerCase()} account</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Email or Username</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter email or username"
              placeholderTextColor="#475569"
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter password"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer links */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp', { role })}
          >
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBackground: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 12,
  },
  backText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    alignItems: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  roleChipHost: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  roleChipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  roleChipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#F1F5F9',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eyeText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: Platform.OS === 'android' ? 60 : 40,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});
