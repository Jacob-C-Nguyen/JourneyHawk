// src/services/location.js
import * as Location from 'expo-location';
import { locationAPI } from './api';

class LocationService {
  constructor() {
    this.isTracking = false;
    this.locationSubscription = null;
    this.currentRoomId = null;
    this.onRoomDeletedCallback = null;
    this.currentStatus = 'present'; // Track attendee status
    this.currentStatusReason = '';
  }

  // Set callback for when room is deleted (404 error)
  setOnRoomDeletedCallback(callback) {
    this.onRoomDeletedCallback = callback;
  }

  // Update attendee status
  async updateStatus(status, reason = '') {
    this.currentStatus = status;
    this.currentStatusReason = reason;
    console.log(`Status updated: ${status}${reason ? ' - ' + reason : ''}`);
    
    // Immediately send location update with new status
    if (this.isTracking && this.currentRoomId) {
      try {
        const location = await this.getCurrentLocation();
        await this.sendLocationUpdate(location);
        console.log('Status change sent to backend immediately');
      } catch (error) {
        console.error('Error sending status update:', error);
      }
    }
  }

  // Request location permissions
  async requestPermissions() {
    try {
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Request background permission (for safety tracking when app is closed)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied - tracking will only work when app is open');
      }

      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

  // Get current location once
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Start tracking location and sending to backend
  async startTracking(roomId) {
    if (this.isTracking) {
      console.log('Already tracking location');
      return;
    }

    try {
      this.currentRoomId = roomId;
      this.isTracking = true;

      // Send initial location
      const initialLocation = await this.getCurrentLocation();
      await this.sendLocationUpdate(initialLocation);

      // Subscribe to location updates
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Or when user moves 10 meters
        },
        async (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          await this.sendLocationUpdate(locationData);
        }
      );

      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  // Send location update to backend
  async sendLocationUpdate(location) {
    if (!this.currentRoomId) {
      console.warn('No room ID set for location update');
      return;
    }

    try {
      await locationAPI.update({
        roomId: this.currentRoomId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        status: this.currentStatus,
        statusReason: this.currentStatusReason,
      });

      console.log('Location updated:', location);
    } catch (error) {
      // Check if room was deleted (404 error)
      if (error.response?.status === 404) {
        console.error('Room not found (404) - stopping tracking');
        
        // Stop tracking immediately
        await this.stopTracking();
        
        // Call the callback to notify app that room was deleted
        if (this.onRoomDeletedCallback) {
          this.onRoomDeletedCallback();
        }
      } else {
        console.error('Error sending location update:', error);
      }
    }
  }

  // Stop tracking location
  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isTracking = false;
    this.currentRoomId = null;

    console.log('Location tracking stopped');
  }

  // Get tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      roomId: this.currentRoomId,
    };
  }
}

// Export singleton instance
export default new LocationService();
