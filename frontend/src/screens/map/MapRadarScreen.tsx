// src/screens/map/MapRadarScreen.js
// Functional Req 8: Displays map showing user locations when clicking map icon
// Functional Req 9: Search bar to find individual attendee by name, phone, or email
// - Role-based visibility: attendees see only hosts, hosts see everyone
// - Real-time location updates via Socket.io
// - Radar circles around user position
// - Color-coded markers (blue=host, green=attendee, orange=away, red=outside geofence)
// - Auto-zoom to searched person
// - GPS locked view when event hasn't started yet
import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Platform,
    Alert,
    AppState,
    TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useRoom} from '../../contexts/RoomContext';
import { locationAPI } from '../../services/api';
import SocketService from '../../services/socket';
import BLEService from '../../services/bleService';
import Constants from 'expo-constants';

export default function MapRadarScreen() {
    const { user } = useAuth();
    const { activeRoom, handleRoomDeleted } = useRoom();
    
    const API_URL = Constants?.expoConfig?.extra?.apiUrl;
    
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [attendeeLocations, setAttendeeLocations] = useState([]);
    const [picoLocations, setPicoLocations] = useState([]);
    const [bleStatus, setBleStatus] = useState("Idle");
    
    const mapRef = useRef(null);
    const isHost = user?.role === 'host';
    const appState = useRef(AppState.currentState);
    const MARKER_SIZE = 20;
    const [selectedId, setSelectedId] = useState(null);
    const locationSubscription = useRef(null);
    
    const [geofenceActive, setGeofenceActive] = useState(true);
    const [geofenceRadius, setGeofenceRadius] = useState(200);
    const alertedIds = useRef(new Set());
    const locationUpdateHandlerRef = useRef(null);
    const userLeftHandlerRef = useRef(null);
    const roomUsersRef = useRef({});
    
    const roomUsers = {};
    if (activeRoom?.attendees) {
        activeRoom.attendees.forEach(a => { roomUsers[String(a.user_id)] = a.username; });
    }
    if (activeRoom?.host) {
        roomUsers[String(activeRoom.host.user_id)] = activeRoom.host.username;
    }
    
    const handleBLEData = (data) => {
        //console.log("RECEIVED:", data);
        setBleStatus("Receiving");
        
        setPicoLocations((prev) => {
            // Key by nodeId (hardware unique ID) — NOT userId which can collide
            const index = prev.findIndex(p => p.nodeId === data.nodeId);
            
            const updated = {
                nodeId: data.nodeId,
                userId: data.userId,
                latitude: data.latitude,
                longitude: data.longitude,
            };
            
            
            if (index !== -1) {
                const copy = [...prev];
                copy[index] = updated;
                return copy;
            } else {
                return [...prev, updated];
            }
        });
    };
    
    //restarts the app when necessary
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            console.log("APP STATE:", nextState);
            
            if (appState.current.match(/inactive|background/) && nextState === "active") {
                console.log("App came to foreground: restart BLE");
                
                BLEService.stop();   // reset
                BLEService.scan(handleBLEData);
            }
            
            if (nextState === "background") {
                console.log("App to background: stop BLE");
                BLEService.stop();
                stopFetchingLocations();
            }
            
            appState.current = nextState;
        });
        
        return () => subscription.remove();
    }, []);
    
    
    useEffect(() => {
        if (!activeRoom) {
            setLoading(false);
            stopFetchingLocations();
            return;
        }
        initializeMap();
        startFetchingLocations();
        
        return () => { stopFetchingLocations(); };
    }, [activeRoom]);
    
    
    // BLE SCAN CONTROLLED HERE
    useEffect(() => {
        if (!activeRoom) return;
        
        console.log("BLE START (mount)");
        setBleStatus("Scanning");
        BLEService.scan(handleBLEData, activeRoom.roomCode);
        
        return () => {
            console.log("BLE STOP (unmount)");
            BLEService.stop();
        };
    }, [activeRoom]);
    
    
    // Geofence
    useEffect(() => {
        if (!geofenceActive || !isHost) return;
        
        const allLocations = [
            ...attendeeLocations.filter(a => a.userId !== user._id),
               ...picoLocations.map(p => ({
                   userId: p.nodeId,
                   latitude: Number(p.latitude),
                   longitude: Number(p.longitude),
                   username: `Pico ${p.userId ?? p.nodeId}`,
               })),
        ];
        
        allLocations.forEach(person => {
            const outside = checkOutside(person.latitude, person.longitude);
            if (outside && !alertedIds.current.has(person.userId)) {
                alertedIds.current.add(person.userId);
                Alert.alert('Geofence Alert', `${person.username} has left the boundary.`);
            } else if (!outside) {
                alertedIds.current.delete(person.userId);
            }
        });
    }, [picoLocations, attendeeLocations, geofenceActive, location]);
    
    
    useEffect(() => {
        if (!searchQuery) { setSelectedId(null); return; }
        
        const match = combinedLocations?.filter(p =>
                                                p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                p.phone?.includes(searchQuery)
                                                );
        
        if (match?.length === 1) {
            setSelectedId(match[0].userId);
            mapRef.current?.animateToRegion({
                latitude: match[0].latitude,
                longitude: match[0].longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
            }, 500);
        } else if (match?.length > 1) {
            const coordinates = match.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude,
            }));
            mapRef.current?.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
            });
        }
    }, [searchQuery, picoLocations, attendeeLocations]);
    
    
    const initializeMap = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
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
                                                                                 setLocation(prev => ({
                                                                                     ...prev,
                                                                                     latitude: pos.coords.latitude,
                                                                                     longitude: pos.coords.longitude,
                                                                                 }));
                                                                             }
                                                                             );
        } catch {
            setLoading(false);
        }
    };
    
    //cleans up the geofence
    useEffect(() => {
        return () => { locationSubscription.current?.remove(); };
    }, []);
    
    // Helper to get status emoji
    const getStatusEmoji = (status) => {
        const statusMap = {
            'present': '',
            'away-restroom': '(Restroom)',
            'away-switching': '(Switching)',
            'away-other': '(Away)',
        };
        return statusMap[status] ?? '';
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
    
    // distance for geofence
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
        if (!geofenceActive || !location) return false;
        return getDistanceMeters(location.latitude, location.longitude, lat, lon) > geofenceRadius;
    };
    
    const startFetchingLocations = () => {
        fetchAttendeeLocations();
        
        locationUpdateHandlerRef.current = (locationData) => {
            setAttendeeLocations(prevLocations => {
                const filtered = prevLocations.filter(loc => loc.userId !== locationData.userId);
                return [...filtered, locationData];
            });
        };
        
        userLeftHandlerRef.current = (data) => {
            setAttendeeLocations(prevLocations =>
                                 prevLocations.filter(loc => loc.userId !== data.userId)
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
            const res = await locationAPI.getRoomLocations(activeRoom._id);
            if (res.success) setAttendeeLocations(res.data);
        } catch (error) {
            if (error.response?.status === 404) {
                stopFetchingLocations();
                Alert.alert(
                            'Room Deleted',
                            'The host has ended this room.',
                            [{ text: 'OK', onPress: handleRoomDeleted }]
                            );
            }
        }
    };
    
    const hasRoomStarted = () => {
        if (!activeRoom?.startDate) {
            return true;
        }
        
        const startDate = new Date(activeRoom.startDate);
        const now = new Date();
        
        return now >= startDate;
    };
    
    const getTimeUntilStart = () => {
        if (!activeRoom?.startDate) return null;
        
        const startDate = new Date(activeRoom.startDate);
        const now = new Date();
        const diff = startDate.getTime() - now.getTime();
        
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
    
    const roomHasStarted = hasRoomStarted();
    
    
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
                
                <Text style={styles.placeholderText}>GPS Map View</Text>
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
                <View style={[styles.legendDot, { backgroundColor: '#c73434' }]} />
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
                <Text style={styles.lockEmoji}>Locked</Text>
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
                    year: 'numeric'
                })}
                </Text>
                <Text style={styles.eventInfoTime}>
                TIME: {startDate.toLocaleTimeString('en-US', {
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
                For your privacy and security, location tracking will begin when the event starts
                </Text>
                </View>
                );
    }
    
    
    
    const visibleLocations = [
        ...attendeeLocations.filter(a => a.userId !== user._id),
    ];
    
    const picoMap = new Map();
    picoLocations.forEach(p => {
        picoMap.set(p.nodeId, {
            userId: p.nodeId,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            role: 'pico',
            username:  roomUsers[String(p.userId)] ?? `Pico ${p.userId ?? p.nodeId}`,
            status: 'present',
            isOutsideGeofence: checkOutside(Number(p.latitude), Number(p.longitude)),
            })
    });
    visibleLocations.forEach(p => picoMap.set(p.userId, p));
    
    const combinedLocations = Array.from(picoMap.values());
    const visibleCount = combinedLocations.filter(p => p.userId !== user._id).length;
    const filteredLocations = searchQuery
    ? combinedLocations.filter(p =>
                               p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               p.phone?.includes(searchQuery)
                               )
    : combinedLocations;
    
    
    
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
            
            {geofenceActive && location && (
                                            <Circle
                                            center={{ latitude: location.latitude, longitude: location.longitude }}
                                            radius={geofenceRadius}
                                            fillColor="rgba(0, 122, 255, 0.1)"
                                            strokeColor="rgba(0, 122, 255, 0.5)"
                                            strokeWidth={2}
                                            />
                                            )}
            
            
            {/* Display visible locations based on user role - using circles for accuracy */}
            
            {filteredLocations.map((attendee) => {
                const isHostMarker = attendee.role === 'host';
                const isPico = attendee.role === 'pico';
                
                let color = isHostMarker ? '#007AFF' : '#c73434';   {/* blue and red */}
                if (isPico) color = '#34c759';  {/* green */}
                
                let markerColor = color;
                
                if (attendee.status && attendee.status !== 'present' && !isPico) markerColor = '#ff9500';
                if (attendee.isOutsideGeofence) markerColor = '#000000';
                
                const statusLabel = getStatusLabel(attendee.status);
                
                return (
                        <Marker
                        key={`${attendee.role}-${attendee.userId}`}
                        coordinate={{
                            latitude: attendee.latitude,
                            longitude: attendee.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={() => {
                            setSelectedId(prev =>
                                          prev === attendee.userId ? null : attendee.userId
                                          );
                        }}
                        >
                        <View
                        style={{
                            width: MARKER_SIZE,
                            height: MARKER_SIZE,
                            borderRadius: MARKER_SIZE / 2,
                            backgroundColor: markerColor,
                            borderWidth: 2,
                            borderColor: '#fff',
                        }}
                        />
                        <Callout tooltip>
                        <View style={{
                            backgroundColor: 'white',
                            padding: 8,
                            borderRadius: 8,
                            minWidth: 100,
                        }}>
                        <Text style={{ fontWeight: '600' }}>{attendee.username || "Unknown"}</Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>{statusLabel}</Text>
                        </View>
                        </Callout>
                        </Marker>
                        );
            })}
            </MapView>
            
            
            {/* Room Info Overlay */}
            <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{activeRoom.name}</Text>
            {searchQuery ? (
                            <Text style={styles.searchResultsText}>
                            Searching {visibleCount} {visibleCount === 1 ? 'result' : 'results'} for "{searchQuery}"
                            </Text>
                            ) : (
                                 <>
                                 <Text style={styles.attendeeCount}>
                                 {visibleCount} {visibleCount === 1 ? 'person' : 'people'} visible
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
            <Text style={styles.legendText}>Hosts</Text>
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
});

