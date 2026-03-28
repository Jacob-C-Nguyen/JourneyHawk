// Req 6: Takes users to the notification screen when clicking the notification tab
// Req 7: Allows host to send a new notification via the "+" button
// Req 19: Notifications displayed with type filtering (message, alert, location_alert)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { useNotification } from '../../contexts/NotificationContext';
import SocketService from '../../services/socket';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { activeRoom } = useRoom();
  const { clearUnreadCount } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);

  const [notificationType, setNotificationType] = useState('message');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [recipientMode, setRecipientMode] = useState<'all' | 'individual'>('all');
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);

  // Req 6: Only host of the active room can send notifications
  const isHost = activeRoom?.host?._id === user?._id;

  // Req 6: Reload list and clear badge every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      clearUnreadCount();
    }, [clearUnreadCount])
  );

  // Req 6: Subscribe to real-time new-notification events for this user
  useEffect(() => {
    if (!user) return;

    const handler = (data) => {
      setNotifications(prev => {
        const exists = prev.some(n => n._id === data.notification._id);
        if (exists) return prev;
        return [data.notification, ...prev];
      });
    };

    SocketService.on('new-notification', handler);
    return () => SocketService.off('new-notification', handler);
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getAll();
      setNotifications(response.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const closeModal = () => {
    setShowSendModal(false);
    setNotificationTitle('');
    setNotificationMessage('');
    setNotificationType('message');
    setRecipientMode('all');
    setSelectedAttendee(null);
  };

  // Req 7: Host sends notification to all attendees or a specific individual
  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!activeRoom) {
      Alert.alert('Error', 'You must be in a room to send notifications');
      return;
    }

    if (!isHost) {
      Alert.alert('Error', 'Only the room host can send notifications');
      return;
    }

    if (recipientMode === 'individual' && !selectedAttendee) {
      Alert.alert('Error', 'Please select an attendee');
      return;
    }

    try {
      setSending(true);

      if (recipientMode === 'all') {
        await notificationAPI.sendToRoom({
          roomId: activeRoom._id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
        });
        Alert.alert('Success', 'Notification sent to all attendees!');
      } else {
        await notificationAPI.send({
          toUserId: selectedAttendee._id,
          roomId: activeRoom._id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
        });
        Alert.alert('Success', `Notification sent to ${selectedAttendee.username}!`);
      }

      closeModal();
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      if (error.response?.status === 404) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      } else {
        console.error('Error marking as read:', error);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Req 19: Color-code notification cards by type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'alert':
        return '#ff3b30';
      case 'location_alert':
        return '#ff9500';
      case 'room_update':
        return '#007AFF';
      case 'message':
      default:
        return '#34c759';
    }
  };

  const renderNotification = ({ item }) => {
    const color = getNotificationColor(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { borderLeftColor: color },
          !item.read && styles.unreadCard,
        ]}
        onPress={() => !item.read && handleMarkAsRead(item._id)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationType, { color }]}>
              {item.type.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          {item.from && (
            <Text style={styles.senderText}>From: {item.from.username}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item._id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts / Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.filter(n => !n.read).length} unread
          </Text>
        </View>

        {isHost && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowSendModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              {activeRoom
                ? 'Alerts and messages will appear here'
                : 'Join a room to receive notifications'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showSendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Notification</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Send To</Text>
              <View style={styles.typeSelector}>
                {(['all', 'individual'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.typeButton, recipientMode === mode && styles.typeButtonActive]}
                    onPress={() => { setRecipientMode(mode); setSelectedAttendee(null); }}
                  >
                    <Text style={[styles.typeButtonText, recipientMode === mode && styles.typeButtonTextActive]}>
                      {mode === 'all' ? 'All Attendees' : 'Individual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {recipientMode === 'individual' && (
                <>
                  <Text style={styles.label}>Select Attendee</Text>
                  {activeRoom?.attendees
                    ?.filter((a: any) => a._id !== user?._id)
                    .map((attendee: any, index: number) => (
                      <TouchableOpacity
                        key={attendee._id ? String(attendee._id) : `attendee-${index}`}
                        style={[
                          styles.attendeeItem,
                          selectedAttendee?._id === attendee._id && styles.attendeeItemSelected,
                        ]}
                        onPress={() => setSelectedAttendee(attendee)}
                      >
                        <View style={styles.attendeeAvatar}>
                          <Text style={styles.attendeeAvatarText}>
                            {attendee.username?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.attendeeName}>{attendee.username}</Text>
                          <Text style={styles.attendeeRole}>{attendee.role?.toUpperCase()}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </>
              )}

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeSelector}>
                {['message', 'alert', 'location_alert'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, notificationType === type && styles.typeButtonActive]}
                    onPress={() => setNotificationType(type)}
                  >
                    <Text style={[styles.typeButtonText, notificationType === type && styles.typeButtonTextActive]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Notification title..."
                value={notificationTitle}
                onChangeText={setNotificationTitle}
              />

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Your message..."
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.sendButton, sending && styles.buttonDisabled]}
                onPress={handleSendNotification}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    {recipientMode === 'all'
                      ? `Send to All Attendees (${(activeRoom?.attendees?.length ?? 1) - 1})`
                      : `Send to ${selectedAttendee ? selectedAttendee.username : '...'}`}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  notificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unreadCard: {
    backgroundColor: '#172554',
    borderColor: '#1E3A5F',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  senderText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  deleteButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 30,
    color: '#64748B',
    fontWeight: '300',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 40,
    color: '#999',
    fontWeight: '300',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  attendeeItemSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#007AFF',
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  attendeeRole: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
