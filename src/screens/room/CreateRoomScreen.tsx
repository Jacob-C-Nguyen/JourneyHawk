// src/screens/room/CreateRoomScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { roomAPI } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useRoom } from '../../contexts/RoomContext';

export default function CreateRoomScreen() {
  const navigation = useNavigation();
  const { setCurrentRoom, loadUserRooms } = useRoom();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  // Geofence state - just radius, center follows host
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceRadius, setGeofenceRadius] = useState('100'); // Default 100 meters
  
  // Date/Time states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000)); // 1 hour later
  const [hasEndDate, setHasEndDate] = useState(false);
  
  // Picker visibility states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateRoom = async () => {
    // Validation
    if (!name || !location) {
      Alert.alert('Error', 'Please fill in Room Name and Location');
      return;
    }

    try {
      setLoading(true);
      
      const roomData = {
        name,
        location,
        notes,
        startDate: startDate.toISOString(),
        endDate: hasEndDate ? endDate.toISOString() : undefined,
      };

      // Add geofence if enabled
      if (geofenceEnabled) {
        roomData.geofence = {
          radius: parseInt(geofenceRadius) || 100,
        };
      }

      const response = await roomAPI.create(roomData);

      // Automatically select the created room as active
      await setCurrentRoom(response.data);
      
      // Reload rooms to update the list
      await loadUserRooms();

      setLoading(false);
      
      Alert.alert(
        'Room Created!',
        `Room Code: ${response.data.roomCode}\n\nShare this code with attendees to join.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Room');
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create room');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Room</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Room Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Geology Field Trip"
          placeholderTextColor="#64748B"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Yosemite National Park"
          placeholderTextColor="#64748B"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Start Date & Time *</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>📅 {formatDate(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text style={styles.dateTimeButtonText}>🕐 {formatTime(startDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Start Date Picker */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const newDate = new Date(startDate);
                newDate.setFullYear(selectedDate.getFullYear());
                newDate.setMonth(selectedDate.getMonth());
                newDate.setDate(selectedDate.getDate());
                setStartDate(newDate);
              }
            }}
          />
        )}

        {/* Start Time Picker */}
        {showStartTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartTimePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const newDate = new Date(startDate);
                newDate.setHours(selectedDate.getHours());
                newDate.setMinutes(selectedDate.getMinutes());
                setStartDate(newDate);
              }
            }}
          />
        )}

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setHasEndDate(!hasEndDate)}
        >
          <View style={styles.checkbox}>
            {hasEndDate && <View style={styles.checkboxChecked} />}
          </View>
          <Text style={styles.checkboxLabel}>Set End Date/Time (Optional)</Text>
        </TouchableOpacity>

        {hasEndDate && (
          <>
            <Text style={styles.label}>End Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>📅 {formatDate(endDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>🕐 {formatTime(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* End Date Picker */}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const newDate = new Date(endDate);
                    newDate.setFullYear(selectedDate.getFullYear());
                    newDate.setMonth(selectedDate.getMonth());
                    newDate.setDate(selectedDate.getDate());
                    setEndDate(newDate);
                  }
                }}
              />
            )}

            {/* End Time Picker */}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowEndTimePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const newDate = new Date(endDate);
                    newDate.setHours(selectedDate.getHours());
                    newDate.setMinutes(selectedDate.getMinutes());
                    setEndDate(newDate);
                  }
                }}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional information..."
          placeholderTextColor="#64748B"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Geofence Section */}
        <Text style={[styles.label, { marginTop: 25 }]}>Safety Zone (Optional)</Text>
        <Text style={styles.helperText}>
          Get alerts when attendees stray too far from you during the event
        </Text>

        {/* Enable Geofence Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setGeofenceEnabled(!geofenceEnabled)}
        >
          <View style={styles.checkbox}>
            {geofenceEnabled && <View style={styles.checkboxChecked} />}
          </View>
          <Text style={styles.checkboxLabel}>Enable proximity alerts</Text>
        </TouchableOpacity>

        {geofenceEnabled && (
          <View style={styles.radiusContainer}>
            <Text style={styles.label}>Alert Distance (meters)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              value={geofenceRadius}
              onChangeText={setGeofenceRadius}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              🔔 You'll be alerted if attendees go beyond {geofenceRadius || '100'}m from you
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateRoom}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Room</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 24,
  },
  backButton: {
    color: '#CBD5E1',
    fontSize: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 15,
    backgroundColor: '#1E293B',
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#E2E8F0',
  },
  textArea: {
    height: 100,
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 10,
  },
  radiusContainer: {
    marginTop: 15,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  buttonDisabled: {
    backgroundColor: '#334155',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
