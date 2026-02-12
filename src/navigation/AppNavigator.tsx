// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { navigationRef } from './navigationRef';

import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import TabNavigator from './TabNavigator';

type RootStackParamList = {
  RoleSelection: undefined;
  Login: { role: string };
  SignUp: { role: string };
  MainApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type RoleSelectionProps = NativeStackScreenProps<RootStackParamList, 'RoleSelection'>;

function RoleSelectionScreen({ navigation }: RoleSelectionProps) {
  const handleRoleSelect = (role: string) => {
    navigation.navigate('Login', { role });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header background wraps brand content */}
      <View style={styles.headerBackground}>
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>JH</Text>
          </View>
          <Text style={styles.title}>JourneyHawk</Text>
          <Text style={styles.subtitle}>Safe trips, every time</Text>
        </View>
      </View>

      {/* Role selection */}
      <View style={styles.cardContainer}>
        <Text style={styles.selectText}>I am a...</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('attendee')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIconCircle}>
            <Text style={styles.roleIcon}>A</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Attendee</Text>
            <Text style={styles.roleDesc}>Student or group member on a trip</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('host')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.roleIcon}>H</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Host / Chaperone</Text>
            <Text style={styles.roleDesc}>Teacher, parent, or trip organizer</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>CSUF · CPSC 491</Text>
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
    paddingBottom: 28,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '400',
  },
  cardContainer: {
    paddingHorizontal: 24,
    flex: 1,
    marginTop: 30,
  },
  selectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  roleIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 3,
  },
  roleDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 28,
    color: '#475569',
    fontWeight: '300',
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    paddingBottom: 30,
  },
});

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <Text style={{ color: '#94A3B8' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName={isAuthenticated ? 'MainApp' : 'RoleSelection'}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          <Stack.Screen name="MainApp" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
