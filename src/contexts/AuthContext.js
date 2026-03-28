// Req 2: Allows users to login with their account credentials
// Req 3: Guides unregistered users through account creation
// Req 21: Handles logout and clears user session on app exit
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';
import SocketService from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data);
        SocketService.connect(token);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Req 3: Creates account and sets user session immediately on success
  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.signup(userData);

      await SecureStore.setItemAsync('userToken', response.data.token);
      const { token, ...userWithoutToken } = response.data;
      setUser(userWithoutToken);
      SocketService.connect(response.data.token);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      setError(null);
      const response = await authAPI.verifyEmail(email, otp);

      await SecureStore.setItemAsync('userToken', response.data.token);
      const { token, ...userWithoutToken } = response.data;
      setUser(userWithoutToken);
      SocketService.connect(response.data.token);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Req 2: Validates role selection (host vs attendee) and stores JWT token on success
  const login = async (credentials, expectedRole) => {
    try {
      setError(null);
      const response = await authAPI.login(credentials);

      if (response.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          userId: response.userId,
          email: response.email,
          error: response.message,
        };
      }

      if (expectedRole && response.data.role !== expectedRole) {
        const actualRole = response.data.role === 'host' ? 'Host / Chaperone' : 'Attendee';
        const errorMessage = `This account is registered as ${actualRole}. Please go back and select the correct role.`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      await SecureStore.setItemAsync('userToken', response.data.token);
      const { token, ...userWithoutToken } = response.data;
      setUser(userWithoutToken);
      SocketService.connect(response.data.token);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Req 21: Disconnects socket and clears stored credentials on logout
  const logout = async () => {
    try {
      SocketService.disconnect();
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    signup,
    verifyEmail,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
