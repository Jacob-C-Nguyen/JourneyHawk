// src/screens/auth/VerifyOTPScreen.tsx
// Collects 6-digit OTP sent to user's email and verifies account
import React, { useState, useRef, useEffect } from 'react';
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
  VerifyOTP: { email: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

export default function VerifyOTPScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { verifyEmail } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;
    const updated = [...otp];
    updated[index] = text;
    setOtp(updated);
    if (text && index < 5) {
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
      Alert.alert('Error', 'Please enter the full 6-digit code');
      return;
    }

    setIsVerifying(true);
    const result = await verifyEmail(email, code);
    setIsVerifying(false);

    if (!result.success) {
      Alert.alert('Verification Failed', result.error || 'Invalid code');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    // On success, AuthContext sets user → AppNavigator redirects to MainApp
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.resendOtp(email);
      setResendCooldown(60);
      Alert.alert('Sent', 'A new code has been sent to your email');
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
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
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={text => handleChange(text, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, isVerifying && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isVerifying}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={isResending || resendCooldown > 0}
        >
          {isResending ? (
            <ActivityIndicator color="#3B82F6" size="small" />
          ) : (
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get it? Resend code"}
            </Text>
          )}
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
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 36,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  otpBoxFilled: {
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
  },
  resendButton: {
    marginTop: 24,
    padding: 8,
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#475569',
  },
});
