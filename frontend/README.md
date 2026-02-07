# JourneyHawk Frontend - UI Skeleton

Frontend UI for JourneyHawk. All screens and navigation are complete. Backend integration needs implementation.

## What's Included

**Complete UI Screens:**
- Authentication: LoginScreen, SignUpScreen
- Home: AccountScreen (calendar), DashboardScreen
- Room: RoomScreen, CreateRoomScreen, JoinRoomScreen
- Map: MapRadarScreen (GPS tracking)
- Notifications: NotificationsScreen
- Navigation: AppNavigator, TabNavigator

**TODO - Backend Integration:**

```
src/contexts/
  - AuthContext.js      (authentication logic)
  - RoomContext.js      (room management)
  - NotificationContext.js (notifications)

src/services/
  - api.js             (REST API with Axios)
  - socket.js          (Socket.io real-time)
  - location.js        (GPS tracking)
```

## Setup

```bash
cd frontend
npm install
npm run tunnel
```

## Backend Tasks

### 1. AuthContext
Implement:
- signup(userData)
- login(credentials)
- logout()
- getMe()

Endpoints:
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

### 2. RoomContext
Implement:
- createRoom(roomData)
- joinRoom(roomCode)
- leaveRoom(roomId)
- deleteRoom(roomId)
- loadUserRooms()

Endpoints:
- POST /api/rooms/create
- POST /api/rooms/join
- PUT /api/rooms/:id/leave
- DELETE /api/rooms/:id
- GET /api/rooms/user/me

### 3. NotificationContext
Implement:
- sendNotification(data)
- markAsRead(id)
- deleteNotification(id)

Endpoints:
- POST /api/notifications/send
- PUT /api/notifications/:id/read
- DELETE /api/notifications/:id

### 4. API Service (api.js)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'YOUR_BACKEND_URL/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 5. Socket Service (socket.js)

```javascript
import { io } from 'socket.io-client';

class SocketService {
  connect(token) {
    this.socket = io('YOUR_BACKEND_URL', {
      auth: { token },
      transports: ['websocket']
    });
  }
  
  joinRoom(roomId) {
    this.socket.emit('join-room', roomId);
  }
  
  on(event, callback) {
    this.socket.on(event, callback);
  }
}
```

Socket events to implement:
- location-update
- user-joined
- user-left
- new-notification

### 6. Location Service (location.js)

```javascript
import * as Location from 'expo-location';

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async () => {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  });
  return location.coords;
};

export const startLocationTracking = async (callback) => {
  return await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 10 },
    callback
  );
};
```

## Configuration

Add Google Maps API key to app.json:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_API_KEY"
        }
      }
    }
  }
}
```

Update backend URLs in:
- src/services/api.js
- src/services/socket.js

## File Structure

```
frontend/
├── src/
│   ├── screens/          [COMPLETE] All UI screens
│   ├── navigation/       [COMPLETE] Navigation setup
│   ├── contexts/         [TODO] Backend logic
│   └── services/         [TODO] API/Socket/Location
├── App.js               [COMPLETE]
├── app.json            [TODO] Add Google Maps key
└── package.json        [COMPLETE]
```

## Dependencies Installed

```
expo-location, expo-secure-store, axios, socket.io-client, react-native-maps
```

## Testing

1. Implement AuthContext first
2. Test with placeholder data
3. Connect to backend
4. Test with 2 phones for real-time features

## Contributors

Alexandro Nino, Arturo Roman Morales
