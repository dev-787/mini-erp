import { useState, useEffect } from 'react';
import { fetchMe, logout as apiLogout } from '../api/auth.api';

let globalState = {
  user: null,
  loading: true,
  initialized: false,
};

const listeners = new Set();

const updateState = (newState) => {
  globalState = { ...globalState, ...newState };
  listeners.forEach((listener) => listener(globalState));
};

export const clearAuthStore = () => {
  updateState({ user: null, loading: false, initialized: true });
};

export const useAuthStore = (selector) => {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  const storeActions = {
    setAuth: (user) => {
      updateState({ user, loading: false, initialized: true });
    },
    logout: async () => {
      try {
        await apiLogout();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        updateState({ user: null, loading: false, initialized: true });
      }
    },
    checkAuth: async () => {
      updateState({ loading: true });
      try {
        const data = await fetchMe();
        updateState({ user: data.user, loading: false, initialized: true });
        return data.user;
      } catch (err) {
        updateState({ user: null, loading: false, initialized: true });
        return null;
      }
    },
  };

  const currentState = { ...globalState, ...storeActions };
  return selector ? selector(currentState) : currentState;
};

useAuthStore.getState = () => globalState;
