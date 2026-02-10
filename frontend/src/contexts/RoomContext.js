// RoomContext.js - FIXED: Persistent activeRoom across tabs
// Location tracking removed

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { roomAPI } from '../services/api';
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
  const [activeRoom, setActiveRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasJoinedRoom = useRef(false); // Track if we've already joined socket room

  useEffect(() => {
    loadActiveRoom();
  }, []);

  useEffect(() => {
    setupSocketListeners();
    return () => {
      cleanupSocketListeners();
    };
  }, []);

  // Join socket room ONLY ONCE when activeRoom is set
  useEffect(() => {
    if (activeRoom && !hasJoinedRoom.current) {
      SocketService.joinRoom(activeRoom._id);
      hasJoinedRoom.current = true;
      console.log('Joined room channel:', activeRoom._id);
    } else if (!activeRoom && hasJoinedRoom.current) {
      // Reset flag when leaving room
      hasJoinedRoom.current = false;
    }
  }, [activeRoom?._id]); // Only trigger when room ID changes

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
      
      // If user has rooms but no active room, select first one
      if (response.data.length > 0 && !activeRoom) {
        await setCurrentRoom(response.data[0]);
      } else if (activeRoom) {
        // Find and update activeRoom data WITHOUT changing the reference
        const updatedActiveRoom = response.data.find(room => room._id === activeRoom._id);
        if (updatedActiveRoom) {
          // IMPORTANT: Only update if attendees changed to avoid re-triggering socket join
          const attendeesChanged = !activeRoom.attendees || 
            activeRoom.attendees.length !== updatedActiveRoom.attendees.length;
          
          if (attendeesChanged) {
            // Update activeRoom in state AND storage
            setActiveRoom(updatedActiveRoom);
            await SecureStore.setItemAsync('activeRoom', JSON.stringify(updatedActiveRoom));
          }
        } else {
          // Active room no longer exists
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
    } catch (error) {
      console.error('Error clearing current room:', error);
    }
  };

  const createRoom = async (roomData) => {
    try {
      setIsLoading(true);
      const response = await roomAPI.create(roomData);
      await setCurrentRoom(response.data);
      await loadUserRooms();
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (roomCode) => {
    try {
      setIsLoading(true);
      const response = await roomAPI.join(roomCode);
      await setCurrentRoom(response.data);
      await loadUserRooms();
      return response.data;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async (roomId) => {
    try {
      setIsLoading(true);
      await roomAPI.leave(roomId);
      
      if (activeRoom?._id === roomId) {
        await clearCurrentRoom();
      }
      
      await loadUserRooms();
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoom = async (roomId) => {
    try {
      setIsLoading(true);
      await roomAPI.delete(roomId);
      
      if (activeRoom?._id === roomId) {
        await clearCurrentRoom();
      }
      
      await loadUserRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    SocketService.on('user-joined', (data) => {
      console.log('User joined:', data.user.username);
      
      setRooms(prevRooms => 
        prevRooms.map(room => {
          if (room._id === data.roomId) {
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
      
      if (activeRoom?._id === data.roomId) {
        setActiveRoom(prev => {
          if (!prev) return prev;
          const userExists = prev.attendees.some(a => a._id === data.user._id);
          if (!userExists) {
            const updated = {
              ...prev,
              attendees: [...prev.attendees, data.user]
            };
            // Update storage too
            SecureStore.setItemAsync('activeRoom', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    });

    SocketService.on('user-left', (data) => {
      console.log('User left:', data.username);
      
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
      
      if (activeRoom?._id === data.roomId) {
        setActiveRoom(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            attendees: prev.attendees.filter(a => a._id !== data.userId)
          };
          // Update storage too
          SecureStore.setItemAsync('activeRoom', JSON.stringify(updated));
          return updated;
        });
      }
    });

    SocketService.on('room-deleted', async (data) => {
      console.log('Room deleted:', data.roomName);
      
      setRooms(prevRooms => {
        const roomExists = prevRooms.some(room => room._id === data.roomId);
        
        if (!roomExists) {
          return prevRooms;
        }
        
        if (activeRoom?._id === data.roomId) {
          Alert.alert(
            'Room Deleted',
            `The host has ended "${data.roomName}".`,
            [{ text: 'OK', onPress: () => handleRoomDeleted() }]
          );
        } else {
          Alert.alert(
            'Room Deleted',
            `"${data.roomName}" has been deleted.`,
            [{ text: 'OK' }]
          );
        }
        
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
    await clearCurrentRoom();
  };

  const value = {
    activeRoom,
    rooms,
    isLoading,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    setCurrentRoom,
    clearCurrentRoom,
    loadUserRooms,
    handleRoomDeleted,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
