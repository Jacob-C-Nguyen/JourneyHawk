import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { locationAPI } from '../../services/api';
import SocketService from '../../services/socket';
import BLEService from '../../services/bleService';

export default function MapRadarScreen() {
  const { user } = useAuth();
  const { activeRoom, clearCurrentRoom } = useRoom();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeLocations, setAttendeeLocations] = useState<any[]>([]);
  const [picoLocations, setPicoLocations] = useState<{ nodeId: any; userId: any; latitude: number; longitude: number }[]>([]);
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [bleStatus, setBleStatus] = useState('Idle');
  const [selectedId, setSelectedId] = useState(null);

  const mapRef = useRef(null);
  const locationUpdateHandlerRef = useRef(null);
  const userLeftHandlerRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const alertedIds = useRef(new Set());

  const isHost = user?.role === 'host';
  const MARKER_SIZE = 20;

  const roomUsers: Record<string, string> = {};
  if (activeRoom?.attendees) {
    activeRoom.attendees.forEach((a) => {
      roomUsers[String(a.user_id)] = a.username;
    });
  }
  if (activeRoom?.host) {
    roomUsers[String(activeRoom.host.user_id)] = activeRoom.host.username;
  }

  useEffect(() => {
    if (activeRoom) {
      initializeMap();
      startFetchingLocations();
    } else {
      stopFetchingLocations();
      setLoading(false);
    }

    return () => {
      stopFetchingLocations();
      locationSubscription.current?.remove();
    };
  }, [activeRoom]);

  useEffect(() => {
    if (!activeRoom) return;

    setBleStatus('Scanning');
    BLEService.scan(handleBLEData, activeRoom.roomCode);

    return () => {
      BLEService.stop();
    };
  }, [activeRoom]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (activeRoom) {
          BLEService.stop();
          setBleStatus('Scanning');
          BLEService.scan(handleBLEData, activeRoom.roomCode);
        }
      }

      if (nextState === 'background') {
        BLEService.stop();
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [activeRoom]);

  const handleBLEData = (data: any) => {
    setBleStatus('Receiving');

    setPicoLocations((prev) => {
      const index = prev.findIndex((p) => p.nodeId === data.nodeId);

      const updated = {
        nodeId: data.nodeId,
        userId: data.userId,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      };

      if (index !== -1) {
        const copy = [...prev];
        copy[index] = updated;
        return copy;
      }

      return [...prev, updated];
    });
  };

  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkOutside = (lat, lon) => {
    if (!location) return false;
    return getDistanceMeters(location.latitude, location.longitude, lat, lon) > geofenceRadius;
  };

  const initializeMap = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use the map feature.'
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setLoading(false);

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
        (pos) => {
          setLocation((prev) =>
            prev
              ? {
                  ...prev,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }
              : prev
          );
        }
      );
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Could not load your location');
      setLoading(false);
    }
  };

  const startFetchingLocations = () => {
    fetchAttendeeLocations();

    locationUpdateHandlerRef.current = (locationData) => {
      setAttendeeLocations((prevLocations) => {
        const filtered = prevLocations.filter((loc) => loc.userId !== locationData.userId);
        return [...filtered, locationData];
      });
    };

    userLeftHandlerRef.current = (data) => {
      setAttendeeLocations((prevLocations) =>
        prevLocations.filter((loc) => loc.userId !== data.userId)
      );
    };

    SocketService.on('location-update', locationUpdateHandlerRef.current);
    SocketService.on('user-left', userLeftHandlerRef.current);
  };

  const stopFetchingLocations = () => {
    SocketService.off('location-update', locationUpdateHandlerRef.current);
    SocketService.off('user-left', userLeftHandlerRef.current);
  };

  const fetchAttendeeLocations = async () => {
    if (!activeRoom) return;

    try {
      const response = await locationAPI.getRoomLocations(activeRoom._id);

      if (response.success && response.data) {
        setAttendeeLocations(response.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        stopFetchingLocations();

        Alert.alert(
          'Room Deleted',
          'The host has ended this room. You have been automatically removed.',
          [{ text: 'OK', onPress: clearCurrentRoom }]
        );
      } else {
        console.error('Error fetching attendee locations:', error);
      }
    }
  };

  const getVisibleUserLocations = () => {
    let filtered = [];

    if (isHost) {
      filtered = attendeeLocations;
    } else {
      filtered = attendeeLocations.filter((attendee) => attendee.role === 'host');
    }

    filtered = filtered.filter((attendee) => attendee.userId !== user._id);

    return filtered.map((attendee) => ({
      ...attendee,
      sourceType: 'user',
      userId: String(attendee.userId),
      latitude: Number(attendee.latitude),
      longitude: Number(attendee.longitude),
      isOutsideGeofence: checkOutside(Number(attendee.latitude), Number(attendee.longitude)),
    }));
  };

  const visibleUserLocations = getVisibleUserLocations();

  const picoMergedLocations = picoLocations.map((p) => ({
    userId: `pico-${p.nodeId}`,
    nodeId: p.nodeId,
    linkedUserId: p.userId,
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    username: roomUsers[String(p.userId)] ?? `Pico ${p.userId ?? p.nodeId}`,
    email: '',
    phone: '',
    role: 'pico',
    status: 'present',
    sourceType: 'pico',
    isOutsideGeofence: checkOutside(Number(p.latitude), Number(p.longitude)),
  }));

  const combinedLocations = [...visibleUserLocations, ...picoMergedLocations];

  const filteredLocations = searchQuery
    ? combinedLocations.filter(
        (person) =>
          person.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.phone?.includes(searchQuery)
      )
    : combinedLocations;

  useEffect(() => {
    if (!isHost || !location) return;

    combinedLocations.forEach((person) => {
      const outside =
        getDistanceMeters(location.latitude, location.longitude, person.latitude, person.longitude) >
        geofenceRadius;

      if (outside && !alertedIds.current.has(person.userId)) {
        alertedIds.current.add(person.userId);
        Alert.alert('Geofence Alert', `${person.username} has left the boundary.`);
      } else if (!outside) {
        alertedIds.current.delete(person.userId);
      }
    });
  }, [combinedLocations, location, geofenceRadius, isHost]);

  const getStatusEmoji = (status) => {
    const statusMap = {
      present: '',
      'away-restroom': '(Restroom)',
      'away-switching': '(Switching)',
      'away-other': '(Away)',
    };
    return statusMap[status] ?? '';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      present: 'Present',
      'away-restroom': 'Away (Restroom)',
      'away-switching': 'Away (Switching Groups)',
      'away-other': 'Away',
    };
    return statusMap[status] || 'Present';
  };

  const hasRoomStarted = () => {
    if (!activeRoom?.startDate) {
      return true;
    }
    const startDate = new Date(activeRoom.startDate);
    const now = new Date();
    return now >= startDate;
  };

  const roomHasStarted = hasRoomStarted();

  const getTimeUntilStart = () => {
    if (!activeRoom?.startDate) return null;
    const startDate = new Date(activeRoom.startDate);
    const now = new Date();
    const diff = startDate - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    if (searchQuery && filteredLocations.length > 0) {
      if (filteredLocations.length === 1) {
        const person = filteredLocations[0];
        setSelectedId(person.userId);

        mapRef.current.animateToRegion(
          {
            latitude: person.latitude,
            longitude: person.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        );
      } else {
        setSelectedId(null);

        const coordinates = filteredLocations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }
    } else if (!searchQuery && location) {
      setSelectedId(null);

      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [searchQuery, filteredLocations, location]);

  if (!activeRoom) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.radarCircle}>
          <View style={styles.radarCenter}>
            <Text style={styles.youText}>YOU</Text>
          </View>
          <View style={styles.radarRing1} />
          <View style={styles.radarRing2} />
          <View style={styles.radarRing3} />
        </View>

        <Text style={styles.placeholderText}>GPS Map View</Text>
        <Text style={styles.placeholderSubtext}>
          Real-time location tracking will appear here
        </Text>
        <Text style={styles.instructionText}>Join a room to see locations</Text>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>You (Host)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#c73434' }]} />
            <Text style={styles.legendText}>Attendees</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34c759' }]} />
            <Text style={styles.legendText}>Picos</Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Map...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load map</Text>
        <Text style={styles.errorSubtext}>Please enable location services</Text>
      </View>
    );
  }

  if (!roomHasStarted && activeRoom) {
    const timeUntilStart = getTimeUntilStart();
    const startDate = new Date(activeRoom.startDate);

    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockIcon}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>

        <Text style={styles.lockedTitle}>Map Not Available Yet</Text>
        <Text style={styles.lockedSubtitle}>GPS tracking is disabled until the event starts</Text>

        <View style={styles.eventInfoBox}>
          <Text style={styles.eventInfoTitle}>{activeRoom.name}</Text>
          <Text style={styles.eventInfoDate}>
            {startDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.eventInfoTime}>
            {startDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {timeUntilStart && (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>Starts in:</Text>
            <Text style={styles.countdownTime}>{timeUntilStart}</Text>
          </View>
        )}

        <Text style={styles.securityNote}>
          For your privacy and security, location tracking will begin when the event starts
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={location}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={geofenceRadius}
          fillColor="rgba(0, 122, 255, 0.1)"
          strokeColor="rgba(0, 122, 255, 0.5)"
          strokeWidth={2}
        />

        {filteredLocations.map((attendee) => {
          const isHostMarker = attendee.role === 'host';
          const isPico = attendee.role === 'pico';
          const statusEmoji = getStatusEmoji(attendee.status);
          const statusLabel = getStatusLabel(attendee.status);

          let markerColor = isHostMarker ? '#007AFF' : '#c73434';
          if (isPico) markerColor = '#34c759';
          if (attendee.status && attendee.status !== 'present' && !isPico) {
            markerColor = '#ff9500';
          }
          if (attendee.isOutsideGeofence) {
            markerColor = '#ff3b30';
          }

          const isSelected = selectedId === attendee.userId;

          return (
            <Marker
              key={attendee.userId}
              coordinate={{
                latitude: attendee.latitude,
                longitude: attendee.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() =>
                setSelectedId((prev) => (prev === attendee.userId ? null : attendee.userId))
              }
            >
              <View
                style={{
                  width: isSelected ? MARKER_SIZE + 6 : MARKER_SIZE,
                  height: isSelected ? MARKER_SIZE + 6 : MARKER_SIZE,
                  borderRadius: isSelected ? (MARKER_SIZE + 6) / 2 : MARKER_SIZE / 2,
                  backgroundColor: markerColor,
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              />
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {statusEmoji} {attendee.username || 'Unknown'}
                  </Text>
                  <Text style={styles.calloutText}>{statusLabel}</Text>
                  <Text style={styles.calloutText}>
                    {isPico ? 'Pico Device' : isHostMarker ? 'Host' : 'Attendee'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{activeRoom.name}</Text>
        {searchQuery ? (
          <Text style={styles.searchResultsText}>
            {filteredLocations.length} {filteredLocations.length === 1 ? 'result' : 'results'} for "
            {searchQuery}"
          </Text>
        ) : (
          <>
            <Text style={styles.attendeeCount}>
              {combinedLocations.length} {combinedLocations.length === 1 ? 'person' : 'people'} visible
            </Text>
            {!isHost && <Text style={styles.attendeeNote}>(Showing hosts and picos)</Text>}
            <Text style={styles.attendeeNote}>BLE: {bleStatus}</Text>
          </>
        )}
      </View>

      {isHost && (
        <View style={styles.geofenceControls}>
          <Text style={styles.geofenceLabel}>Geofence: {geofenceRadius}m</Text>
          <Slider
            style={{ width: 180 }}
            minimumValue={10}
            maximumValue={500}
            step={10}
            value={geofenceRadius}
            onValueChange={(val) => setGeofenceRadius(val)}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#ccc"
          />
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>{isHost ? 'You & Other Hosts' : 'Hosts'}</Text>
        </View>
        {isHost && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#c73434' }]} />
            <Text style={styles.legendText}>Attendees</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34c759' }]} />
          <Text style={styles.legendText}>Picos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 30,
  },
  lockIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lockEmoji: {
    fontSize: 30,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  eventInfoBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  eventInfoDate: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  eventInfoTime: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  countdownBox: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    marginBottom: 20,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 5,
    textAlign: 'center',
  },
  countdownTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  securityNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  radarCircle: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  radarCenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  youText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  radarRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.3,
  },
  radarRing2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.2,
  },
  radarRing3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.1,
  },
  placeholderText: {
    fontSize: 24,
    color: '#F1F5F9',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    width: '80%',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  roomInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  attendeeCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  attendeeNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 5,
    fontWeight: '600',
  },
  geofenceControls: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  geofenceLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0F172A',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 14,
    color: '#F1F5F9',
  },
  callout: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  calloutText: {
    fontWeight: '600',
    fontSize: 13,
  },
});