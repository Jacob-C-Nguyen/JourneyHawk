// src/screens/room/AttendeeDetailScreen.tsx
// Functional Req 11: The application should allow the user to view an attendee's basic information
// Functional Req 12: The application should allow the host to remove any registered attendee
// - Shows attendee's username, email, phone, role, current status
// - Host-only: Remove Attendee button with confirmation
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { roomAPI } from '../../services/api';

export default function AttendeeDetailScreen({ route, navigation }) {
  const { attendee, roomId } = route.params;
  const { user } = useAuth();
  const { loadUserRooms, activeRoom } = useRoom();
  const [removing, setRemoving] = useState(false);

  const isHost = user?.role === 'host' && activeRoom?.host?._id === user?._id;

  const handleRemove = () => {
    Alert.alert(
      'Remove Attendee',
      `Are you sure you want to remove ${attendee.username} from the room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemoving(true);
              await roomAPI.removeAttendee(roomId, attendee._id);
              await loadUserRooms();
              Alert.alert('Done', `${attendee.username} has been removed.`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove attendee');
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendee Detail</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {attendee.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.username}>{attendee.username}</Text>
        <View style={[styles.roleBadge, attendee.role === 'host' && styles.hostBadge]}>
          <Text style={styles.roleBadgeText}>
            {attendee.role === 'host' ? 'HOST' : 'ATTENDEE'}
          </Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{attendee.email || '\u2014'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{attendee.phone || '—'}</Text>
        </View>
      </View>

      {isHost && attendee._id !== user._id && attendee._id !== activeRoom?.host?._id && (
        <TouchableOpacity
          style={[styles.removeButton, removing && styles.buttonDisabled]}
          onPress={handleRemove}
          disabled={removing}
        >
          {removing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.removeButtonText}>Remove from Room</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 24,
  },
  backButton: { color: '#CBD5E1', fontSize: 16, paddingVertical: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9', marginTop: 4 },
  avatarSection: { alignItems: 'center', paddingVertical: 36 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: '#fff' },
  username: { fontSize: 24, fontWeight: '700', color: '#F1F5F9', marginBottom: 10 },
  roleBadge: {
    backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  hostBadge: { backgroundColor: '#3B82F6' },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  infoSection: { paddingHorizontal: 20 },
  infoCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  infoLabel: {
    fontSize: 12, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  infoValue: { fontSize: 17, color: '#F1F5F9', fontWeight: '500' },
  removeButton: {
    backgroundColor: '#EF4444', margin: 20, marginTop: 10,
    padding: 16, borderRadius: 14, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#7f1d1d' },
  removeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
