// Functional Req 5: The application should allow users to click on an event to see full details
// - Shows room name, date/time, location, notes, room code, attendee count
// - Navigated to from AccountScreen calendar event cards
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function EventDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const { user } = useAuth();

  const isHost = room.host?._id === user?._id || room.host === user?._id;

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>\u2190 Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Event Detail</Text>
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.eventName}>{room.name}</Text>
        <View style={[styles.badge, isHost && styles.hostBadge]}>
          <Text style={styles.badgeText}>{isHost ? 'HOST' : 'ATTENDEE'}</Text>
        </View>
      </View>

      <View style={styles.cardsSection}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Date</Text>
          <Text style={styles.cardValue}>{formatDate(room.startDate)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Start Time</Text>
          <Text style={styles.cardValue}>{formatTime(room.startDate)}</Text>
        </View>

        {room.endDate && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>End Time</Text>
            <Text style={styles.cardValue}>{formatTime(room.endDate)}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Location</Text>
          <Text style={styles.cardValue}>{room.location || '\u2014'}</Text>
        </View>

        <View style={[styles.card, styles.codeCard]}>
          <Text style={styles.cardLabel}>Room Code</Text>
          <Text style={styles.roomCode}>{room.roomCode}</Text>
          <Text style={styles.codeHint}>Share this with attendees to join</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Attendees</Text>
          <Text style={styles.cardValue}>
            {room.attendees?.length || 0} {room.attendees?.length === 1 ? 'person' : 'people'}
          </Text>
        </View>

        {room.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={[styles.cardValue, styles.notesText]}>{room.notes}</Text>
          </View>
        ) : null}

        {room.geofence?.radius ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Safety Zone</Text>
            <Text style={styles.cardValue}>{room.geofence.radius}m from host</Text>
          </View>
        ) : null}
      </View>
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
  heroSection: {
    padding: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventName: {
    fontSize: 22, fontWeight: '800', color: '#F1F5F9', flex: 1,
  },
  badge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  hostBadge: { backgroundColor: '#3B82F6' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  cardsSection: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeCard: { borderColor: '#3B82F6', borderWidth: 2 },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6,
  },
  cardValue: { fontSize: 17, color: '#F1F5F9', fontWeight: '500' },
  roomCode: {
    fontSize: 28, fontWeight: '800', color: '#3B82F6',
    letterSpacing: 4, marginBottom: 4,
  },
  codeHint: { fontSize: 12, color: '#64748B' },
  notesText: { lineHeight: 22, color: '#94A3B8' },
});
