# JourneyHawk Frontend

All UI screens are done. Your job is to connect them to the backend.

## What Works Right Now

All the screens are built and styled:
- Login & Signup screens
- Account screen with calendar
- Room creation and joining screens
- Map with GPS tracking UI
- Notifications screen

Everything looks good, but nothing actually saves data or talks to a server yet.

## What You Need to Build

You need to implement 6 files that handle all the backend stuff:

**Contexts** (manage app state):
- src/contexts/AuthContext.js - login, signup, logout
- src/contexts/RoomContext.js - create rooms, join rooms, manage attendees
- src/contexts/NotificationContext.js - send and receive notifications

**Services** (talk to backend):
- src/services/api.js - HTTP requests to your REST API
- src/services/socket.js - real-time updates with Socket.io
- src/services/location.js - GPS location tracking

Right now these files exist but they're just empty placeholders.

## How to Get Started

Install dependencies:
```bash
cd frontend
npm install
```

Run the app:
```bash
npm start
```

The app will launch and you can click around, but buttons won't do anything until you implement the backend connections.

## Implementation Order

Start with authentication, then build from there:

1. Implement AuthContext - connect login/signup to your backend API
2. Implement RoomContext - connect room creation/joining to your API
3. Implement Socket Service - add real-time updates
4. Implement Location Service - add GPS tracking
5. Implement NotificationContext - add notifications

## API Endpoints Needed

Your backend needs these routes:

Authentication:
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

Rooms:
- POST /api/rooms/create
- POST /api/rooms/join
- GET /api/rooms/user/me
- PUT /api/rooms/:id/leave
- DELETE /api/rooms/:id

Notifications:
- GET /api/notifications
- POST /api/notifications/send
- PUT /api/notifications/:id/read
- DELETE /api/notifications/:id

Location:
- POST /api/location/update
- GET /api/location/room/:roomId

## Socket Events Needed

For real-time features, listen for these events:
- location-update - when someone moves
- user-joined - when someone joins a room
- user-left - when someone leaves a room
- new-notification - when a notification is sent

## Configuration

Add your Google Maps API key in app.json:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_KEY_HERE"
    }
  }
}
```

Update the backend URL in api.js and socket.js to point to your server.

## File Structure

```
frontend/
├── src/
│   ├── screens/          - DONE (all UI screens)
│   ├── navigation/       - DONE (navigation setup)
│   ├── contexts/         - TODO (your job)
│   └── services/         - TODO (your job)
├── App.js               - DONE
└── package.json         - DONE
```

## Questions?

The screens are already calling functions like login(), createRoom(), etc. You just need to make those functions actually work by connecting them to your backend.
