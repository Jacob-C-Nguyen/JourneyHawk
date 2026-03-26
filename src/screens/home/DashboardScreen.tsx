// src/screens/home/DashboardScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            // Navigation happens automatically via AuthContext
            // No need to manually navigate
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to JourneyHawk!</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Username:</Text>
        <Text style={styles.value}>{user?.username}</Text>
        
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
        
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{user?.phone}</Text>
        
        <Text style={styles.label}>Role:</Text>
        <Text style={[styles.value, styles.roleTag]}>
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert('Coming Soon', 'Room features will be available soon!')}
      >
        <Text style={styles.buttonText}>
          {user?.role === 'host' ? 'Create Room' : 'Join Room'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => Alert.alert('Coming Soon', 'Map view will be available soon!')}
      >
        <Text style={styles.secondaryButtonText}>View Map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  roleTag: {
    backgroundColor: '#007AFF',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    marginTop: 10,
  },
});
