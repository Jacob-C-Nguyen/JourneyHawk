// Req 8: Manages phone GPS tracking and sends coordinate updates to the backend
// Req 21: Stops tracking automatically when the user exits the app
import * as Location from 'expo-location';
import { locationAPI } from './api';

class LocationService {
  constructor() {
    this.isTracking = false;
    this.locationSubscription = null;
    this.currentRoomId = null;
    this.onRoomDeletedCallback = null;
    this.currentStatus = 'present';
    this.currentStatusReason = '';
  }

  setOnRoomDeletedCallback(callback) {
    this.onRoomDeletedCallback = callback;
  }

  // Req 8: Updates attendee status and immediately sends a location update with the new status
  async updateStatus(status, reason = '') {
    this.currentStatus = status;
    this.currentStatusReason = reason;

    if (this.isTracking && this.currentRoomId) {
      try {
        const location = await this.getCurrentLocation();
        await this.sendLocationUpdate(location);
      } catch (error) {
        console.error('Error sending status update:', error);
      }
    }
  }

  // Req 8: Requests foreground and background location permissions
  async requestPermissions() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

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

  // Req 8: Starts polling GPS every 10 seconds or 10 meters of movement
  async startTracking(roomId) {
    if (this.isTracking) {
      return;
    }

    try {
      this.currentRoomId = roomId;
      this.isTracking = true;

      const initialLocation = await this.getCurrentLocation();
      await this.sendLocationUpdate(initialLocation);

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
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
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  async sendLocationUpdate(location) {
    if (!this.currentRoomId) {
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
    } catch (error) {
      if (error.response?.status === 404) {
        console.error('Room not found (404) - stopping tracking');
        await this.stopTracking();
        if (this.onRoomDeletedCallback) {
          this.onRoomDeletedCallback();
        }
      } else {
        console.error('Error sending location update:', error);
      }
    }
  }

  // Req 21: Stops GPS polling and clears room association
  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isTracking = false;
    this.currentRoomId = null;
  }

  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      roomId: this.currentRoomId,
    };
  }
}

export default new LocationService();
