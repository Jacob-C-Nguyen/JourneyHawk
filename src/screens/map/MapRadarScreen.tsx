// src/screens/map/MapRadarScreen.js
import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom } from '../../contexts/RoomContext';
import { locationAPI } from '../../services/api';
import LocationService from '../../services/location';
import SocketService from '../../services/socket';

export default function MapRadarScreen() {
  const { user } = useAuth();
  const { activeRoom, handleRoomDeleted } = useRoom();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendeeLocations, setAttendeeLocations] = useState([]);
  const mapRef = useRef(null);
  const locationUpdateInterval = useRef(null);

  // Check if current user is a host
  const isHost = user?.role === 'host';

  // Set up callback for room deletion detection (attendees only)
  useEffect(() => {
    if (!isHost) {
      LocationService.setOnRoomDeletedCallback(() => {
        Alert.alert(
          'Room Deleted',
          'The host has ended this room. You have been automatically removed.',
          [{ text: 'OK', onPress: handleRoomDeleted }]
        );
      });
    }

    return () => {
      LocationService.setOnRoomDeletedCallback(null);
    };
  }, [isHost]);

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
    };
  }, [activeRoom]);

  const initializeMap = async () => {
    try {
      setLoading(true);
      
      // Get current location
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
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Could not load your location');
      setLoading(false);
    }
  };

  const startFetchingLocations = () => {
    // Fetch initial locations
    fetchAttendeeLocations();

    // Listen for real-time location updates via socket
    SocketService.on('location-update', (locationData) => {
      console.log('📍 Real-time location update:', locationData.username);
      
      // Update locations state in real-time
      setAttendeeLocations(prevLocations => {
        // Remove old location for this user
        const filtered = prevLocations.filter(loc => loc.userId !== locationData.userId);
        // Add new location
        return [...filtered, locationData];
      });
    });

    // Listen for users leaving - remove them from map
    SocketService.on('user-left', (data) => {
      console.log('🔔 [MapRadar] User left, removing from map:', data.username);
      
      // Remove user from locations immediately
      setAttendeeLocations(prevLocations => 
        prevLocations.filter(loc => loc.userId !== data.userId)
      );
    });
  };

  const stopFetchingLocations = () => {
    // Remove socket listeners
    SocketService.off('location-update');
    SocketService.off('user-left');
  };

  const fetchAttendeeLocations = async () => {
    if (!activeRoom) return;

    try {
      const response = await locationAPI.getRoomLocations(activeRoom._id);
      
      if (response.success && response.data) {
        setAttendeeLocations(response.data);
      }
    } catch (error) {
      // Check if room was deleted (404 error)
      if (error.response?.status === 404) {
        console.log('Room no longer exists while fetching locations');
        stopFetchingLocations();
        
        Alert.alert(
          'Room Deleted',
          'The host has ended this room. You have been automatically removed.',
          [{ text: 'OK', onPress: handleRoomDeleted }]
        );
      } else {
        console.error('Error fetching attendee locations:', error);
      }
    }
  };

  // Filter locations based on user role (Proposal Section 4.1.10)
  // Attendees can ONLY see hosts
  // Hosts can see everyone
  // IMPORTANT: Filter out current user (they're already shown by Google Maps)
  const getVisibleLocations = () => {
    let filtered = [];
    
    if (isHost) {
      // Hosts see everyone (all attendees and other hosts)
      filtered = attendeeLocations;
    } else {
      // Attendees ONLY see hosts (not other attendees)
      filtered = attendeeLocations.filter((attendee) => attendee.role === 'host');
    }
    
    // Remove current user from the list (Google Maps already shows them)
    filtered = filtered.filter((attendee) => attendee.userId !== user._id);
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((attendee) =>
        attendee.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.phone?.includes(searchQuery)
      );
    }
    
    return filtered;
  };

  const visibleLocations = getVisibleLocations();

  // Helper to get status emoji
  const getStatusEmoji = (status) => {
    const statusMap = {
      'present': '✅',
      'away-restroom': '🚻',
      'away-switching': '👥',
      'away-other': '⚠️',
    };
    return statusMap[status] || '✅';
  };

  // Helper to get status label
  const getStatusLabel = (status) => {
    const statusMap = {
      'present': 'Present',
      'away-restroom': 'Away (Restroom)',
      'away-switching': 'Away (Switching Groups)',
      'away-other': 'Away',
    };
    return statusMap[status] || 'Present';
  };

  // Check if room has started (if it has a start date)
  const hasRoomStarted = () => {
    if (!activeRoom?.startDate) {
      return true; // No start date means room is always active
    }
    const startDate = new Date(activeRoom.startDate);
    const now = new Date();
    return now >= startDate;
  };

  const roomHasStarted = hasRoomStarted();

  // Calculate time until start
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

  // Zoom to searched person(s) when search query changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (searchQuery && visibleLocations.length > 0) {
      if (visibleLocations.length === 1) {
        // If search results in exactly 1 person, zoom to them
        const person = visibleLocations[0];
        mapRef.current.animateToRegion({
          latitude: person.latitude,
          longitude: person.longitude,
          latitudeDelta: 0.005, // Zoomed in view
          longitudeDelta: 0.005,
        }, 1000); // 1 second animation
      } else {
        // If multiple results, fit all in view
        const coordinates = visibleLocations.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }
    } else if (!searchQuery && location) {
      // When search is cleared, zoom back to user's location
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [searchQuery, visibleLocations, location]);

  // No active room - show placeholder (Figure 4.1.10 placeholder)
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

        <Text style={styles.placeholderText}>📍 GPS Map View</Text>
        <Text style={styles.placeholderSubtext}>
          Real-time location tracking will appear here
        </Text>
        <Text style={styles.instructionText}>Join a room to see locations</Text>

        {/* Legend matching proposal */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>You (Host)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34c759' }]} />
            <Text style={styles.legendText}>Attendees</Text>
          </View>
        </View>
      </View>
    );
  }

  // Loading map
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Map...</Text>
      </View>
    );
  }

  // Map failed to load
  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load map</Text>
        <Text style={styles.errorSubtext}>
          Please enable location services
        </Text>
      </View>
    );
  }

  // Room hasn't started yet - show locked view
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
            📅 {startDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          <Text style={styles.eventInfoTime}>
            🕒 {startDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
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
          🛡️ For your privacy and security, location tracking will begin when the event starts
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar - as per Figure 4.1.10 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Map View with radar-like interface */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={location}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {/* Radar circle around user (as shown in proposal mockup) */}
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={500} // 500 meters
          fillColor="rgba(0, 122, 255, 0.1)"
          strokeColor="rgba(0, 122, 255, 0.5)"
          strokeWidth={2}
        />

        {/* Display visible locations based on user role - using circles for accuracy */}
        {visibleLocations.map((attendee) => {
          const isHostMarker = attendee.role === 'host';
          const color = isHostMarker ? '#007AFF' : '#34c759';
          const statusEmoji = getStatusEmoji(attendee.status);
          const statusLabel = getStatusLabel(attendee.status);
          
          // Change color based on status
          let markerColor = color;
          if (attendee.status && attendee.status !== 'present') {
            markerColor = '#ff9500'; // Orange for away statuses
          }
          if (attendee.isOutsideGeofence) {
            markerColor = '#ff3b30'; // Red for outside geofence
          }
          
          return (
            <Fragment key={attendee.userId}>
              {/* Outer circle (border) */}
              <Circle
                center={{
                  latitude: attendee.latitude,
                  longitude: attendee.longitude,
                }}
                radius={3} // 3 meters - extra small for accuracy
                fillColor={markerColor}
                strokeColor="#fff"
                strokeWidth={2}
              />
              
              {/* Invisible marker for tap interaction */}
              <Marker
                coordinate={{
                  latitude: attendee.latitude,
                  longitude: attendee.longitude,
                }}
                title={`${statusEmoji} ${attendee.username || 'Unknown'}`}
                description={`${statusLabel}${attendee.isOutsideGeofence ? ' - Outside Safety Zone' : ''}${isHostMarker ? ' (Host)' : ''}`}
                opacity={0}
              />
            </Fragment>
          );
        })}
      </MapView>

      {/* Room Info Overlay */}
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{activeRoom.name}</Text>
        {searchQuery ? (
          <Text style={styles.searchResultsText}>
            🔍 {visibleLocations.length} {visibleLocations.length === 1 ? 'result' : 'results'} for "{searchQuery}"
          </Text>
        ) : (
          <>
            <Text style={styles.attendeeCount}>
              {visibleLocations.length} {visibleLocations.length === 1 ? 'person' : 'people'} visible
            </Text>
            {!isHost && (
              <Text style={styles.attendeeNote}>
                (Showing hosts only)
              </Text>
            )}
          </>
        )}
      </View>

      {/* Legend - matching proposal Figure 4.1.10 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>{isHost ? 'You & Other Hosts' : 'Hosts'}</Text>
        </View>
        {isHost && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34c759' }]} />
            <Text style={styles.legendText}>Attendees</Text>
          </View>
        )}
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
    fontSize: 50,
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
});
