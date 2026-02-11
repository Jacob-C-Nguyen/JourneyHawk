// src/contexts/RoomContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { roomAPI } from '../services/api';
import LocationService from '../services/location';
import SocketService from '../services/socket';

const RoomContext = createContext();

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

export const RoomProvider = ({ children }) => {
  const [activeRoom, setActiveRoom] = useState(null); // Currently selected room for map view
  const [rooms, setRooms] = useState([]); // All rooms user is in
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load active room on mount
  useEffect(() => {
    loadActiveRoom();
  }, []);

  // Setup global socket listeners (always active)
  useEffect(() => {
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [activeRoom]); // Re-setup when activeRoom changes so we have latest reference

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

  const loadUserRooms = async () => {
    try {
      setIsLoading(true);
      const response = await roomAPI.getUserRooms();
      setRooms(response.data);
      
      // If user has rooms but no active room selected, select the first one
      if (response.data.length > 0 && !activeRoom) {
        await setCurrentRoom(response.data[0]);
      } else if (activeRoom) {
        // Update active room data if it exists in the response
        const updatedActiveRoom = response.data.find(room => room._id === activeRoom._id);
        if (updatedActiveRoom) {
          // Only update if data actually changed to avoid triggering useEffect
          // Just update the activeRoom reference WITHOUT calling setCurrentRoom
          // This prevents unnecessary tracking stops/starts
          setActiveRoom(prev => {
            // Deep comparison - only update if something changed
            const hasChanged = !prev || 
              prev.attendees?.length !== updatedActiveRoom.attendees?.length ||
              prev.name !== updatedActiveRoom.name ||
              prev.notes !== updatedActiveRoom.notes;
            
            return hasChanged ? updatedActiveRoom : prev;
          });
        } else {
          // Active room no longer exists (might have been deleted)
          await clearCurrentRoom();
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentRoom = async (room) => {
    try {
      setActiveRoom(room);
      await SecureStore.setItemAsync('activeRoom', JSON.stringify(room));
    } catch (error) {
      console.error('Error setting current room:', error);
    }
  };

  const clearCurrentRoom = async () => {
    try {
      setActiveRoom(null);
      await SecureStore.deleteItemAsync('activeRoom');
      await stopTracking();
    } catch (error) {
      console.error('Error clearing current room:', error);
    }
  };

  const startTracking = async () => {
    if (!activeRoom || isTracking) return;

    // Check if room has a start date and hasn't started yet
    if (activeRoom.startDate) {
      const startDate = new Date(activeRoom.startDate);
      const now = new Date();
      if (now < startDate) {
        console.log('⚠️ Location tracking disabled - event has not started yet');
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
      console.log('🔔 [Global] User joined:', data.user.username, 'in room:', data.roomId);
      
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
      if (activeRoom?._id === data.roomId) {
        setActiveRoom(prev => {
          if (!prev) return prev;
          const userExists = prev.attendees.some(a => a._id === data.user._id);
          if (!userExists) {
            return {
              ...prev,
              attendees: [...prev.attendees, data.user]
            };
          }
          return prev;
        });
      }
    });

    // Listen for users leaving ANY room
    SocketService.on('user-left', (data) => {
      console.log('🔔 [Global] User left:', data.username, 'from room:', data.roomId);
      
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
      if (activeRoom?._id === data.roomId) {
        setActiveRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            attendees: prev.attendees.filter(a => a._id !== data.userId)
          };
        });
      }
    });

    // Listen for room deletion
    SocketService.on('room-deleted', async (data) => {
      console.log('🔔 [Global] Room deleted:', data.roomName);
      
      // Use functional setState to get current rooms and check if user is in this room
      setRooms(prevRooms => {
        const roomExists = prevRooms.some(room => room._id === data.roomId);
        
        if (!roomExists) {
          console.log('Not in this room, ignoring deletion event');
          return prevRooms; // Don't show alert if not in the room
        }
        
        // Room exists in user's rooms, show appropriate alert
        if (activeRoom?._id === data.roomId) {
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

  const value = {
    activeRoom,
    rooms,
    isTracking,
    isLoading,
    setCurrentRoom,
    clearCurrentRoom,
    loadUserRooms,
    handleRoomDeleted,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
