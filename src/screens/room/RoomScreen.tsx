// src/screens/room/RoomScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { roomAPI } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import StatusSelector from '../../components/StatusSelector';

export default function RoomScreen({ navigation, route }) {
  const { user } = useAuth();
  const { activeRoom, rooms, isTracking, isLoading, loadUserRooms, clearCurrentRoom, setCurrentRoom } = useRoom();
  const [localRoom, setLocalRoom] = useState(activeRoom);
  const [userStatus, setUserStatus] = useState('present'); // Track user's current status

  // Sync localRoom with activeRoom
  useEffect(() => {
    setLocalRoom(activeRoom);
  }, [activeRoom]);

  // Reload rooms whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserRooms();
    }, [route?.params?.refresh])
  );

  const handleLeaveRoom = async (room, isHost) => {
    if (!room) return;

    if (isHost) {
      // Host should delete the room, not leave it
      Alert.alert(
        'Delete Room',
        'As the host, you cannot leave the room. Would you like to delete it instead? This will remove all attendees.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Room',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete room
                await roomAPI.delete(room._id);
                
                // If this was the active room, clear it
                if (activeRoom?._id === room._id) {
                  await clearCurrentRoom();
                }
                
                // Reload rooms
                await loadUserRooms();
                
                Alert.alert('Room Deleted', 'The room and all attendees have been removed.');
              } catch (error) {
                console.error('Error deleting room:', error);
                Alert.alert('Error', 'Failed to delete room');
              }
            },
          },
        ]
      );
    } else {
      // Attendee can leave
      Alert.alert(
        'Leave Room',
        'Are you sure you want to leave this room? Location tracking will stop if this is your active room.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                // If this was the active room, clear it first
                if (activeRoom?._id === room._id) {
                  await clearCurrentRoom();
                }
                
                // Then leave room on backend
                await roomAPI.leave(room._id);
                
                // Reload rooms
                await loadUserRooms();
                
                Alert.alert('Success', 'You have left the room');
              } catch (error) {
                console.error('Error leaving room:', error);
                Alert.alert('Error', 'Failed to leave room');
              }
            },
          },
        ]
      );
    }
  };

  // If user has rooms, show list of all rooms
  if (rooms.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Rooms</Text>
          <Text style={styles.headerSubtitle}>{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</Text>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isHost = item.host?._id === user?._id;
            const isSelected = activeRoom?._id === item._id;
            const isEventLocked = item.startDate && new Date(item.startDate) > new Date();
            
            return (
              <View style={[styles.roomCard, isSelected && styles.selectedRoomCard]}>
                <TouchableOpacity
                  onPress={() => setCurrentRoom(item)}
                  style={styles.roomCardContent}
                >
                  <View style={styles.roomCardHeader}>
                    <Text style={styles.roomCardName}>{item.name}</Text>
                    {isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>HOST</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.roomCardCode}>Code: {item.roomCode}</Text>
                  
                  {item.startDate && (
                    <Text style={styles.roomCardDate}>
                      📅 {new Date(item.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  )}
                  
                  <Text style={styles.roomCardAttendees}>
                    👥 {item.attendees?.length || 0} {item.attendees?.length === 1 ? 'person' : 'people'}
                  </Text>
                  
                  {item.notes && (
                    <Text style={styles.roomCardNotes} numberOfLines={2}>
                      📝 {item.notes}
                    </Text>
                  )}
                  
                  {item.geofence && item.geofence.radius && (
                    <Text style={styles.roomCardGeofence}>
                      🛡️ Safety zone: {item.geofence.radius}m from host
                    </Text>
                  )}
                  
                  {isSelected && !isHost && isTracking && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusLabel}>Your Status:</Text>
                      <StatusSelector 
                        currentStatus={userStatus}
                        onStatusChange={(status, reason) => {
                          setUserStatus(status);
                          console.log('Status changed to:', status, reason);
                        }}
                      />
                    </View>
                  )}
                  
                  {isSelected && isTracking && !isEventLocked && (
                    <View style={styles.trackingBadgeSmall}>
                      <View style={styles.trackingDotSmall} />
                      <Text style={styles.trackingTextSmall}>Tracking Active</Text>
                    </View>
                  )}
                  
                  {isSelected && isEventLocked && (
                    <View style={[styles.trackingBadgeSmall, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                      <Text style={styles.trackingTextSmall}>🔒 GPS Locked</Text>
                    </View>
                  )}
                  
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>✔ Selected for Map View</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.roomCardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setCurrentRoom(item);
                      navigation.navigate('Map');
                    }}
                  >
                    <Text style={styles.actionButtonText}>🗺️ Map</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => handleLeaveRoom(item, isHost)}
                  >
                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                      {isHost ? 'Delete' : 'Leave'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No rooms yet</Text>
          }
        />

        <View style={styles.bottomActions}>
          {user?.role === 'host' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CreateRoom')}
            >
              <Text style={styles.primaryButtonText}>+ Create Room</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, user?.role === 'host' && styles.secondaryButton]}
            onPress={() => navigation.navigate('JoinRoom')}
          >
            <Text style={[styles.primaryButtonText, user?.role === 'host' && styles.secondaryButtonText]}>Join Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No active room - show options (Figure 4.1.7)
  return (
    <View style={styles.container}>
      <View style={styles.noRoomContainer}>
        <Text style={styles.noRoomTitle}>No Active Room</Text>
        <Text style={styles.noRoomSubtitle}>
          {user?.role === 'host'
            ? 'Create a new room or join an existing one'
            : 'Join a room using a code'}
        </Text>

        {user?.role === 'host' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('CreateRoom')}
          >
            <Text style={styles.primaryButtonText}>Create Room</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, user?.role !== 'host' && styles.primaryButton]}
          onPress={() => navigation.navigate('JoinRoom')}
        >
          <Text style={styles.primaryButtonText}>Join Room</Text>
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
  header: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  roomCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedRoomCard: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  roomCardContent: {
    padding: 15,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    flex: 1,
  },
  hostBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  roomCardCode: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  roomCardDate: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  roomCardAttendees: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  roomCardNotes: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  roomCardGeofence: {
    fontSize: 13,
    color: '#4caf50',
    marginBottom: 8,
  },
  statusContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  trackingBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trackingDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34c759',
    marginRight: 6,
  },
  trackingTextSmall: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  selectedIndicator: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  roomCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#334155',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  dangerButtonText: {
    color: '#EF4444',
  },
  bottomActions: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: '90%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#3B82F6',
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  roomCode: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
    marginRight: 8,
  },
  trackingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  attendeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    color: '#94A3B8',
  },
  attendeeRole: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 4,
    fontWeight: '600',
  },
  detailButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  detailButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 20,
  },
  leaveButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noRoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRoomTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 10,
  },
  noRoomSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
});
