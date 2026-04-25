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
    } catch {
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (verifiedData) => {
    try {
      setError(null);
      await SecureStore.setItemAsync('userToken', verifiedData.token);
      const { token, ...userWithoutToken } = verifiedData;
      setUser(userWithoutToken);
      SocketService.connect(verifiedData.token);
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

  const logout = async () => {
    SocketService.disconnect();
    await SecureStore.deleteItemAsync('userToken');
    setUser(null);
    setError(null);
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
