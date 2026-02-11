// src/screens/room/JoinRoomScreen.js
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
} from 'react-native';
import { roomAPI } from '../../services/api';
import { useRoom } from '../../contexts/RoomContext';

export default function JoinRoomScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setCurrentRoom, loadUserRooms } = useRoom();

  const handleJoinRoom = async () => {
    if (!roomCode || roomCode.length < 8) {
      Alert.alert('Error', 'Please enter a valid room code');
      return;
    }

    try {
      setLoading(true);
      const response = await roomAPI.join(roomCode.toUpperCase());

      // Automatically select the joined room as active
      await setCurrentRoom(response.data);
      
      // Reload rooms to update the list
      await loadUserRooms();

      Alert.alert(
        'Success!',
        `You joined: ${response.data.name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Room'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to join room. Check the code and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Join Room</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Enter the room code provided by your host</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Room Code"
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
        />

        <Text style={styles.hint}>Room code is 8 characters (e.g., A3F9B2C1)</Text>

        <TouchableOpacity
          style={[styles.joinButton, loading && styles.buttonDisabled]}
          onPress={handleJoinRoom}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>Join Room</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 20,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 4,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
