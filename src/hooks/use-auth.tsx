
// src/hooks/use-auth.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const READ_ONLY_USER_IDS = ["EHU0KtmxX3ZVKpkeW7RuMuo7LXn2", "jHacXqv5eMUAh116naGkzawIujf2"];
const AUDIT_USER_IDS = ["yR3U1PqJ7xW8s9T0vE1uC2xY4z5"]; // Placeholder for audit@educlass.ro

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isReadOnly: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isReadOnly: false, isAuditor: false });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isAuditor, setIsAuditor] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setIsReadOnly(READ_ONLY_USER_IDS.includes(user.uid));
        setIsAuditor(user.email === 'audit@educlass.ro'); // Use email for audit role
      } else {
        setIsReadOnly(false);
        setIsAuditor(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isReadOnly, isAuditor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export const useIsReadOnly = () => {
    const { isReadOnly } = useAuth();
    return isReadOnly;
}
