// src/navigation/TabNavigator.tsx
import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationProvider } from '../contexts/NotificationContext';

// Import screens (React Native auto-resolves .tsx)
import AccountScreen from '../screens/home/AccountScreen';
import RoomScreen from '../screens/room/RoomScreen';
import CreateRoomScreen from '../screens/room/CreateRoomScreen';
import JoinRoomScreen from '../screens/room/JoinRoomScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import MapRadarScreen from '../screens/map/MapRadarScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Room Stack Navigator (for Create/Join screens)
function RoomStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoomMain" component={RoomScreen} />
      <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
      <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NotificationProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            paddingBottom: Platform.OS === 'android' ? 5 + insets.bottom : 5,
            paddingTop: 5,
            height: Platform.OS === 'android' ? 60 + insets.bottom : 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{
            tabBarLabel: 'Account',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: 20, color, fontWeight: 'bold' }}>A</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Room"
          component={RoomStack}
          options={{
            tabBarLabel: 'Room',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: 20, color, fontWeight: 'bold' }}>R</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            tabBarLabel: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: 20, color, fontWeight: 'bold' }}>!</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapRadarScreen}
          options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: 20, color, fontWeight: 'bold' }}>M</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NotificationProvider>
  );
}
