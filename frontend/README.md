# JourneyHawk Frontend - UI Skeleton

This is the **frontend UI skeleton** for JourneyHawk. All screens and navigation are complete, but the backend integration needs to be implemented.

## What's Included

### ✅ Complete UI Screens
- **Authentication:** LoginScreen, SignUpScreen
- **Home:** AccountScreen (with calendar), DashboardScreen
- **Room Management:** RoomScreen, CreateRoomScreen, JoinRoomScreen
- **Map:** MapRadarScreen (GPS tracking UI)
- **Notifications:** NotificationsScreen
- **Navigation:** AppNavigator, TabNavigator

### ⚠️ TODO: Backend Integration Needed

Your team needs to implement these files:

```
src/contexts/
  ├── AuthContext.js      ← Implement authentication logic
  ├── RoomContext.js      ← Implement room management logic
  └── NotificationContext.js ← Implement notification logic

src/services/
  ├── api.js             ← Implement REST API calls (Axios)
  ├── socket.js          ← Implement Socket.io for real-time updates
  └── location.js        ← Implement GPS location tracking (Expo Location)
```

## Setup

```bash
cd frontend
npm install
```

## Run the App

```bash
# Start with tunnel (works on any network)
npm run tunnel

# Or start normally
npm start
```

## Backend Integration Tasks

### 1. AuthContext (src/contexts/AuthContext.js)

Implement these functions:
```javascript
- signup(userData) → Register new user
- login(credentials) → Login user
- logout() → Logout user
- getMe() → Get current user info
```

Connect to backend endpoints:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### 2. RoomContext (src/contexts/RoomContext.js)

Implement these functions:
```javascript
- createRoom(roomData) → Create a new room
- joinRoom(roomCode) → Join room with code
- leaveRoom(roomId) → Leave a room
- deleteRoom(roomId) → Delete a room (host only)
- loadUserRooms() → Get all user's rooms
```

Connect to backend endpoints:
- `POST /api/rooms/create`
- `POST /api/rooms/join`
- `PUT /api/rooms/:id/leave`
- `DELETE /api/rooms/:id`
- `GET /api/rooms/user/me`

### 3. NotificationContext (src/contexts/NotificationContext.js)

Implement these functions:
```javascript
- sendNotification(data) → Send notification
- markAsRead(id) → Mark notification as read
- deleteNotification(id) → Delete notification
```

Connect to backend endpoints:
- `POST /api/notifications/send`
- `PUT /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

### 4. API Service (src/services/api.js)

Use Axios to create HTTP client:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'YOUR_BACKEND_URL/api',
  headers: { 'Content-Type': 'application/json' }
});

// Add JWT token interceptor
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 5. Socket Service (src/services/socket.js)

Use Socket.io Client for real-time updates:
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

Events to listen for:
- `location-update` → When someone's location updates
- `user-joined` → When someone joins the room
- `user-left` → When someone leaves the room
- `new-notification` → When a notification is sent

### 6. Location Service (src/services/location.js)

Use Expo Location:
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

## Google Maps API Key

Add your Google Maps API key to `app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

## Backend URL Configuration

Update backend URL in:
- `src/services/api.js` → API_URL
- `src/services/socket.js` → SOCKET_URL

## Screen Functionality

### LoginScreen & SignUpScreen
- Uses `useAuth()` hook for login/signup
- Stores JWT token in SecureStore
- Navigates to MainApp on success

### AccountScreen
- Shows calendar with upcoming events
- Displays user info
- Lists rooms from `useRoom()` hook

### RoomScreen
- Shows attendee list
- Create/Join room buttons
- Uses `useRoom()` hook

### MapRadarScreen
- Shows all attendee locations
- Uses `Location.watchPositionAsync` for tracking
- Sends updates via Socket.io

### NotificationsScreen
- Lists all notifications
- Send notification form (hosts only)
- Real-time updates via Socket.io

## Dependencies Already Installed

```json
{
  "expo-location": "~19.0.8",
  "expo-secure-store": "~15.0.8",
  "axios": "^1.13.2",
  "socket.io-client": "^4.8.3",
  "react-native-maps": "1.20.1"
}
```

## File Structure

```
frontend/
├── src/
│   ├── screens/          ✅ COMPLETE - All UI screens
│   ├── navigation/       ✅ COMPLETE - Navigation setup
│   ├── contexts/         ⚠️ TODO - Implement backend logic
│   └── services/         ⚠️ TODO - Implement API/Socket/Location
├── App.js               ✅ COMPLETE
├── app.json            ⚠️ TODO - Add Google Maps API key
└── package.json        ✅ COMPLETE
```

## Testing

1. Implement one context at a time (start with AuthContext)
2. Test with placeholder data first
3. Connect to backend once context logic works
4. Test real-time features with 2 phones

## Contributors

- Alexandro Nino (Frontend UI)
- Arturo Roman Morales (Frontend UI)
- [Your teammates] (Backend Integration)

## Questions?

If you have questions about the UI screens or how they should connect to the backend, contact Alexandro or Arturo.
