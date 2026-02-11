// App.js
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { RoomProvider } from './src/contexts/RoomContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </RoomProvider>
    </AuthProvider>
  );
}
