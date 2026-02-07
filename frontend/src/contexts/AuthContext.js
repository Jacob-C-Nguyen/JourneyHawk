// TODO: Implement authentication context
// Your teammates will implement this with backend integration
export const AuthContext = null;
export const AuthProvider = ({ children }) => children;
export const useAuth = () => ({
  user: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  isLoading: false
});
