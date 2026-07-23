import { create } from 'zustand';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: any;
  assignedCircle?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
  isLoading: true, // Starts true until verified on initial app load
  login: (user, token) => {
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
    set({ user, accessToken: token || null, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
