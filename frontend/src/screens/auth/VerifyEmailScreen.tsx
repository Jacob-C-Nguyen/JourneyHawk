import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

type RootStackParamList = {
  VerifyEmail: { email: string; role: string; signupData: any };
  SignUp: { role: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { email, role, signupData } = route.params;
  const { signup } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authAPI.verifyOTP(email, code);
      setIsLoading(false);

      if (result.success) {
        await signup(result.data);
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid code');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Verification Failed', error.response?.data?.message || 'Something went wrong');
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.sendOTP(signupData);
      setIsResending(false);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch {
      setIsResending(false);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerBackground}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { if (ref) inputs.current[index] = ref; }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(val) => handleChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={isResending}
        >
          <Text style={styles.resendText}>
            {isResending ? 'Sending...' : "Didn't receive it? Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerBackground: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingHorizontal: 24,
    paddingBottom: 32,
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
  },
  email: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '700',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: '#3B82F6',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
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
  resendButton: {
    marginTop: 24,
    padding: 8,
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
