// src/screens/home/AccountScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const { rooms, loadUserRooms } = useRoom();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Load rooms when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserRooms();
    }, [])
  );

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  // Create calendar days
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days in month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Navigate months
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format time
  const timeString = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.username}!</Text>
        <Text style={styles.date}>{dateString}</Text>
      </View>

      {/* Calendar Section */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        
        <View style={styles.calendarCard}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYear}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={index} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const isToday = day === today.getDate() && isCurrentMonth;
              return (
                <View key={index} style={styles.dayCell}>
                  {day && (
                    <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                      <Text style={[styles.dayText, isToday && styles.todayText]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{timeString}</Text>
          </View>
        </View>
      </View>

      {/* Upcoming Events Section */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {rooms.length > 0 ? (
          rooms
            .filter(room => {
              // Only show rooms with future start dates
              if (!room.startDate) return false;
              const startDate = new Date(room.startDate);
              const now = new Date();
              return startDate > now;
            })
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 3) // Show max 3 upcoming events
            .map(room => (
              <View key={room._id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventName}>{room.name}</Text>
                  <Text style={styles.eventBadge}>
                    {room.host._id === user?._id || room.host === user?._id ? 'HOST' : 'ATTENDEE'}
                  </Text>
                </View>
                <Text style={styles.eventDate}>
                  {new Date(room.startDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(room.startDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {room.location && (
                  <Text style={styles.eventLocation}>{room.location}</Text>
                )}
              </View>
            ))
        ) : (
          <View style={[styles.eventCard, { alignItems: 'center' }]}>
            <Text style={styles.noEventsText}>No upcoming events</Text>
            <Text style={styles.noEventsSubtext}>
              Join or create a room to see events here
            </Text>
          </View>
        )}
      </View>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{user?.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role:</Text>
          <Text style={[styles.infoValue, styles.roleTag]}>
            {user?.role?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: '#94A3B8',
  },
  calendarSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#E2E8F0',
  },
  calendarCard: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#334155',
  },
  navButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCircle: {
    backgroundColor: '#3B82F6',
  },
  dayText: {
    fontSize: 15,
    color: '#CBD5E1',
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeDisplay: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 15,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    letterSpacing: 1,
  },
  eventsSection: {
    padding: 20,
    paddingTop: 0,
  },
  eventCard: {
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
    flex: 1,
  },
  eventBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#94A3B8',
  },
  noEventsText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 5,
    textAlign: 'center',
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  userInfoSection: {
    padding: 20,
    paddingTop: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  roleTag: {
    backgroundColor: '#3B82F6',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 15,
    margin: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
