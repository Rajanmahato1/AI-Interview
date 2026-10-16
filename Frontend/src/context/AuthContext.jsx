import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token from localStorage and fetch current user
  useEffect(() => {
    const token = localStorage.getItem('aip_token');
    if (token) {
      authApi.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('aip_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Sync Firebase user with backend MongoDB
  const syncWithBackend = async (firebaseUser, customName) => {
    const idToken = await firebaseUser.getIdToken();
    const res = await authApi.firebaseAuth({
      idToken,
      email: firebaseUser.email,
      name: customName || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
      firebaseUid: firebaseUser.uid,
      photoUrl: firebaseUser.photoURL || '',
    });
    localStorage.setItem('aip_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  // Google Sign-In with Firebase
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return await syncWithBackend(result.user);
  };

  // Email / Password login with Firebase
  const loginWithFirebase = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return await syncWithBackend(result.user);
  };

  // Register with Firebase
  const registerWithFirebase = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateProfile(result.user, { displayName: name });
      } catch (e) {
        console.error('Failed to update displayName:', e);
      }
    }
    return await syncWithBackend(result.user, name);
  };

  // Standard backend login
  const login = async (email, password) => {
    // Try Firebase auth first, fallback to backend login if needed
    try {
      return await loginWithFirebase(email, password);
    } catch {
      const res = await authApi.login({ email, password });
      localStorage.setItem('aip_token', res.data.token);
      setUser(res.data.user);
      return res.data;
    }
  };

  // Standard backend register
  const register = async (name, email, password) => {
    try {
      return await registerWithFirebase(name, email, password);
    } catch {
      const res = await authApi.register({ name, email, password });
      localStorage.setItem('aip_token', res.data.token);
      setUser(res.data.user);
      return res.data;
    }
  };

  const logout = async () => {
    try { await signOut(auth); } catch {}
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('aip_token');
    setUser(null);
  };

  const sendPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
      await authApi.forgotPassword(email);
    }
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        loginWithFirebase,
        registerWithFirebase,
        sendPasswordReset,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
