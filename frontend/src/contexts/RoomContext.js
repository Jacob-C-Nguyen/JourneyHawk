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

  // Ref so socket callbacks always see the latest activeRoom without re-registering
  const activeRoomRef = useRef(activeRoom);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    loadActiveRoom();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const cleanup = setupSocketListeners();
    return cleanup;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(() => loadUserRooms(), 15000);
    return () => clearInterval(interval);
  }, [currentUserId, loadUserRooms]);

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

      const savedRoom = await SecureStore.getItemAsync('activeRoom');
      const currentActiveRoom = savedRoom ? JSON.parse(savedRoom) : null;

      if (response.data.length > 0 && !currentActiveRoom) {
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

    if (activeRoom.startDate) {
      const startDate = new Date(activeRoom.startDate);
      const now = new Date();
      if (now < startDate) {
        return;
      }
    }

    try {
      const permissions = await LocationService.requestPermissions();

      if (!permissions.foreground) {
        throw new Error('Location permission denied');
      }

      await LocationService.startTracking(activeRoom._id);
      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  };

  const stopTracking = async () => {
    try {
      await LocationService.stopTracking();
      setIsTracking(false);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const setupSocketListeners = () => {
    const onUserJoined = (data) => {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          if (room._id === data.roomId) {
            const userExists = room.attendees.some(a => a._id === data.user._id);
            if (!userExists) {
              return { ...room, attendees: [...room.attendees, data.user] };
            }
          }
          return room;
        })
      );

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
    };

    const onUserLeft = (data) => {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          if (room._id === data.roomId) {
            return { ...room, attendees: room.attendees.filter(a => a._id !== data.userId) };
          }
          return room;
        })
      );

      if (activeRoomRef.current?._id === data.roomId) {
        if (data.userId === currentUserId) {
          Alert.alert(
            'Removed from Room',
            'You have been removed from this room by the host.',
            [{ text: 'OK', onPress: () => clearCurrentRoom() }]
          );
        } else {
          setActiveRoom(prev => {
            if (!prev) return prev;
            return { ...prev, attendees: prev.attendees.filter(a => a._id !== data.userId) };
          });
        }
      }
    };

    const onRoomDeleted = (data) => {
      if (data.deletedByUserId === currentUserId) {
        setRooms(prevRooms => prevRooms.filter(room => room._id !== data.roomId));
        return;
      }

      setRooms(prevRooms => {
        const roomExists = prevRooms.some(room => room._id === data.roomId);
        if (!roomExists) return prevRooms;

        if (activeRoomRef.current?._id === data.roomId) {
          Alert.alert(
            'Room Deleted',
            `The host has ended "${data.roomName}". You have been automatically removed.`,
            [{ text: 'OK', onPress: () => handleRoomDeleted() }]
          );
        } else {
          Alert.alert(
            'Room Deleted',
            `"${data.roomName}" has been deleted by the host.`,
            [{ text: 'OK' }]
          );
        }

        return prevRooms.filter(room => room._id !== data.roomId);
      });
    };

    SocketService.on('user-joined', onUserJoined);
    SocketService.on('user-left', onUserLeft);
    SocketService.on('room-deleted', onRoomDeleted);

    return () => {
      SocketService.off('user-joined', onUserJoined);
      SocketService.off('user-left', onUserLeft);
      SocketService.off('room-deleted', onRoomDeleted);
    };
  };

  const handleRoomDeleted = async () => {
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
