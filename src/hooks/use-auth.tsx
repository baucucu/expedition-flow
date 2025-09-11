// src/hooks/use-auth.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const READ_ONLY_USER_IDS = ["EHU0KtmxX3ZVKpkeW7RuMuo7LXn2", "jHacXqv5eMUAh116naGkzawIujf2"];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isReadOnly: false });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsReadOnly(user ? READ_ONLY_USER_IDS.includes(user.uid) : false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useIsReadOnly = () => {
    const { isReadOnly } = useAuth();
    return isReadOnly;
}
