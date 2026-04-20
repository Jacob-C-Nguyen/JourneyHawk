// src/contexts/RoomContext.js
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { roomAPI } from '../services/api';
import LocationService from '../services/location';
import SocketService from '../services/socket';
import { useAuth } from './AuthContext';

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};


export const RoomProvider = ({ children }) => {
    const { user } = useAuth();
    const currentUserId = user?._id;
    const [activeRoom, setActiveRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [attendees, setAttendees] = useState([]);
    
    // Ref so socket callbacks always see the latest activeRoom without re-registering
    const activeRoomRef = useRef(activeRoom);
    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);
    
    // Load active room on mount
    useEffect(() => {
        loadActiveRoom();
    }, []);
    
    // Setup socket listeners once — use activeRoomRef inside handlers
    useEffect(() => {
        setupSocketListeners();
        return () => {
            cleanupSocketListeners();
        };
    }, []);
    
    // Start tracking and join socket room when active room changes
    useEffect(() => {
        if (activeRoom && !isTracking) {
            startTracking();
            SocketService.joinRoom(activeRoom._id);
            
            
        } else if (!activeRoom && isTracking) {
            stopTracking();
        }
    }, [activeRoom]);
    
    
    
    
    const loadActiveRoom = async () => {
        try {
            const savedRoom = await SecureStore.getItemAsync('activeRoom');
            if (savedRoom) {
                const room = JSON.parse(savedRoom);
                setActiveRoom(room);
            }
        } catch (error) {
            console.error('Error loading active room:', error);
        }
    };
    
    const setCurrentRoom = useCallback(async (room) => {
        try {
            setActiveRoom(room);
            await SecureStore.setItemAsync('activeRoom', JSON.stringify(room));
        } catch (error) {
            console.error('Error setting current room:', error);
        }
    }, []);
    
    const clearCurrentRoom = useCallback(async () => {
        try {
            setActiveRoom(null);
            await SecureStore.deleteItemAsync('activeRoom');
        } catch (error) {
            console.error('Error clearing current room:', error);
        }
    }, []);
    
    const loadUserRooms = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await roomAPI.getUserRooms();
            setRooms(response.data);
            
            // Read from SecureStore to avoid stale closure issues
            const savedRoom = await SecureStore.getItemAsync('activeRoom');
            const currentActiveRoom = savedRoom ? JSON.parse(savedRoom) : null;
            
            if (response.data.length > 0 && !currentActiveRoom) {
                // No room selected yet — pick the first one
                await setCurrentRoom(response.data[0]);
            } else if (currentActiveRoom) {
                const updatedActiveRoom = response.data.find(room => room._id === currentActiveRoom._id);
                if (updatedActiveRoom) {
                    setActiveRoom(prev => {
                        const hasChanged = !prev ||
                        prev.attendees?.length !== updatedActiveRoom.attendees?.length ||
                        prev.name !== updatedActiveRoom.name ||
                        prev.notes !== updatedActiveRoom.notes;
                        return hasChanged ? updatedActiveRoom : prev;
                    });
                } else {
                    await clearCurrentRoom();
                }
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setIsLoading(false);
        }
    }, [setCurrentRoom, clearCurrentRoom]);
    
    const startTracking = async () => {
        
        if (!activeRoom || isTracking) return;
        
        // Check if room has a start date and hasn't started yet
        if (activeRoom.startDate) {
            const startDate = new Date(activeRoom.startDate);
            const now = new Date();
            if (now < startDate) {
                console.log('Location tracking disabled - event has not started yet');
                return; // Don't start tracking until event begins
            }
        }
        
        try {
            const permissions = await LocationService.requestPermissions();
            
            if (!permissions.foreground) {
                throw new Error('Location permission denied');
            }
            
            await LocationService.startTracking(activeRoom._id);
            setIsTracking(true);
            console.log('Location tracking started for room:', activeRoom.name);
        } catch (error) {
            console.error('Error starting location tracking:', error);
            throw error;
        }
    };
    
    const stopTracking = async () => {
        try {
            await LocationService.stopTracking();
            setIsTracking(false);
            console.log('Location tracking stopped');
        } catch (error) {
            console.error('Error stopping location tracking:', error);
        }
    };
    
    const setupSocketListeners = () => {
        // Listen for new users joining ANY room
        SocketService.on('user-joined', (data) => {
            console.log('[Global] User joined:', data.user.username, 'in room:', data.roomId);
            
            // Update the specific room in the rooms array
            setRooms(prevRooms =>
                     prevRooms.map(room => {
                if (room._id === data.roomId) {
                    // Check if user already exists
                    const userExists = room.attendees.some(a => a._id === data.user._id);
                    if (!userExists) {
                        return {
                            ...room,
                            attendees: [...room.attendees, data.user]
                        };
                    }
                }
                return room;
            })
                     );
            
            // Also update activeRoom if it matches
            if (activeRoomRef.current?._id === data.roomId) {
                setActiveRoom(prev => {
                    if (!prev) return prev;
                    const userExists = prev.attendees.some(a => a._id === data.user._id);
                    if (!userExists) {
                        return { ...prev, attendees: [...prev.attendees, data.user] };
                    }
                    return prev;
                });
            }
        });
        
        // Listen for users leaving ANY room
        SocketService.on('user-left', (data) => {
            console.log('[Global] User left:', data.username, 'from room:', data.roomId);
            
            // Update the specific room in the rooms array
            setRooms(prevRooms =>
                     prevRooms.map(room => {
                if (room._id === data.roomId) {
                    return {
                        ...room,
                        attendees: room.attendees.filter(a => a._id !== data.userId)
                    };
                }
                return room;
            })
                     );
            
            // Also update activeRoom if it matches
            if (activeRoomRef.current?._id === data.roomId) {
                setActiveRoom(prev => {
                    if (!prev) return prev;
                    return { ...prev, attendees: prev.attendees.filter(a => a._id !== data.userId) };
                });
            }
        });
        
        // Listen for room deletion (only show alerts for attendees, not the host who deleted it)
        SocketService.on('room-deleted', async (data) => {
            console.log('[Global] Room deleted:', data.roomName);
            
            // If this host initiated the delete, just clean up silently
            if (data.deletedByUserId === currentUserId) {
                console.log('We deleted this room, skipping alert');
                setRooms(prevRooms => prevRooms.filter(room => room._id !== data.roomId));
                return;
            }
            
            // Use functional setState to get current rooms and check if user is in this room
            setRooms(prevRooms => {
                const roomExists = prevRooms.some(room => room._id === data.roomId);
                
                if (!roomExists) {
                    console.log('Not in this room, ignoring deletion event');
                    return prevRooms; // Don't show alert if not in the room
                }
                
                // Room exists in user's rooms, show appropriate alert
                if (activeRoomRef.current?._id === data.roomId) {
                    Alert.alert(
                                'Room Deleted',
                                `The host has ended "${data.roomName}". You have been automatically removed.`,
                                [{ text: 'OK', onPress: () => handleRoomDeleted() }]
                                );
                } else {
                    // Just show a non-blocking alert for other rooms user is still in
                    Alert.alert(
                                'Room Deleted',
                                `"${data.roomName}" has been deleted by the host.`,
                                [{ text: 'OK' }]
                                );
                }
                
                // Remove room from array
                return prevRooms.filter(room => room._id !== data.roomId);
            });
        });
    };
    
    const cleanupSocketListeners = () => {
        SocketService.off('user-joined');
        SocketService.off('user-left');
        SocketService.off('room-deleted');
    };
    
    const handleRoomDeleted = async () => {
        console.log('Room was deleted, cleaning up...');
        await clearCurrentRoom();
    };
    
    const [picoLocations, setPicoLocations] = useState({});
    
    const updatePicoLocation = (packet) => {
        setPicoLocations((prev) => {
            const existing = prev[packet.userId];
            
            // DEDUPE using sequence number
            if (existing && packet.seq <= existing.seq) {
                return prev;
            }
            
            return {
                ...prev,
                [packet.userId]: {
                    ...packet,
                    lastSeen: Date.now(),
                },
            };
        });
    };
    
    // Optional: cleanup old picos
    useEffect(() => {
        const interval = setInterval(() => {
            setPicoLocations((prev) => {
                const now = Date.now();
                const updated = {};
                
                for (const id in prev) {
                    if (now - prev[id].lastSeen < 10000) {
                        updated[id] = prev[id];
                    }
                }
                
                return updated;
            });
        }, 3000);
        
        return () => clearInterval(interval);
    }, []);
    
    
    const value = {
        activeRoom,
        rooms,
        isTracking,
        isLoading,
        setCurrentRoom,
        clearCurrentRoom,
        loadUserRooms,
        handleRoomDeleted,
        
        picoLocations,
        updatePicoLocation,
    };
    
    
    return (
            <RoomContext.Provider value={value}>
            {children}
            </RoomContext.Provider>
            );
};
