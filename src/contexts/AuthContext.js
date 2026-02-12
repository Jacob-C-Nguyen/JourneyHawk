// src/contexts/AuthContext.js
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

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        // Get user data from backend
        const response = await authAPI.getMe();
        setUser(response.data);
        
        // Connect socket
        SocketService.connect(token);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Token is invalid/expired, clear it and treat user as logged out
      await SecureStore.deleteItemAsync('userToken');
      setUser(null); // Important: Set user to null so app shows login screen
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.signup(userData);
      
      // Store token securely
      await SecureStore.setItemAsync('userToken', response.data.token);
      
      // Set user data (without token)
      const { token, ...userWithoutToken } = response.data;
      setUser(userWithoutToken);
      
      // Connect socket
      SocketService.connect(response.data.token);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const login = async (credentials, expectedRole) => {
    try {
      setError(null);
      const response = await authAPI.login(credentials);
      
      // Role-based access check
      if (expectedRole && response.data.role !== expectedRole) {
        const roleName = expectedRole === 'host' ? 'Host / Chaperone' : 'Attendee';
        const actualRole = response.data.role === 'host' ? 'Host / Chaperone' : 'Attendee';
        const errorMessage = `This account is registered as ${actualRole}. Please go back and select the correct role.`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      // Store token securely
      await SecureStore.setItemAsync('userToken', response.data.token);
      
      // Set user data (without token)
      const { token, ...userWithoutToken } = response.data;
      setUser(userWithoutToken);
      
      // Connect socket
      SocketService.connect(response.data.token);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Disconnect socket
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
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
