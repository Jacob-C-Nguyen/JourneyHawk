// Functional Req 15: Host can invite an attendee by phone number
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
} from 'react-native';
import { roomAPI } from '../../services/api';
import { useRoom } from '../../contexts/RoomContext';

export default function InviteAttendeeScreen({ route, navigation }) {
  const { roomId } = route.params;
  const { loadUserRooms } = useRoom();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await roomAPI.inviteAttendee(roomId, trimmed);
      await loadUserRooms();
      Alert.alert(
        'Invited!',
        `${result.data.username} has been added to the room.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Failed', error.response?.data?.message || 'Could not invite attendee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invite Attendee</Text>
        <Text style={styles.subtitle}>Add someone by their phone number</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor="#475569"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
          />
        </View>
        <Text style={styles.hint}>
          The person must already have a JourneyHawk account with this phone number.
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleInvite}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add to Room</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 28,
  },
  backButton: { color: '#CBD5E1', fontSize: 16, paddingVertical: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 4, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#94A3B8' },
  form: { paddingHorizontal: 24, paddingTop: 32 },
  label: {
    color: '#94A3B8', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  inputWrapper: {
    backgroundColor: '#1E293B', borderRadius: 14,
    borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  input: { padding: 16, fontSize: 16, color: '#F1F5F9' },
  hint: { fontSize: 13, color: '#475569', marginBottom: 28, marginLeft: 4, lineHeight: 18 },
  button: {
    backgroundColor: '#3B82F6', padding: 17, borderRadius: 14, alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  buttonDisabled: { backgroundColor: '#334155', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
