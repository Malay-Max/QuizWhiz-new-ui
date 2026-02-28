"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, onAuthStateChanged as firebaseOnAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

export type UserRole = "admin" | "user";

export interface UserDoc {
    uid: string;
    email: string;
    username: string;
    displayUsername: string;
    role: UserRole;
    createdAt: unknown;
}

interface AuthContextValue {
    user: User | null;
    userDoc: UserDoc | null;
    isAdmin: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, userDoc: null, isAdmin: false, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(app);
        let unsubscribeDoc: (() => void) | null = null;

        const unsubscribeAuth = firebaseOnAuthStateChanged(auth, (firebaseUser: User | null) => {
            setUser(firebaseUser);

            // Clean up previous doc listener if exists
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (firebaseUser) {
                // Use onSnapshot so role changes in console reflect immediately
                unsubscribeDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
                    setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
                    setIsLoading(false);
                });
            } else {
                setUserDoc(null);
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    const isAdmin = userDoc?.role === "admin";

    return (
        <AuthContext.Provider value={{ user, userDoc, isAdmin, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
