"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getAuth, onAuthStateChanged as firebaseOnAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

export type UserRole = "admin" | "user";

// All available permission keys
export const PERMISSIONS = {
    GENERATE_QUESTIONS: "generate_questions",
    EDIT_QUESTIONS: "edit_questions",
    MANAGE_TESTS: "manage_tests",
    MANAGE_GOALS: "manage_goals",
    VIEW_ANALYTICS: "view_analytics",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    [PERMISSIONS.GENERATE_QUESTIONS]: "Generate Questions",
    [PERMISSIONS.EDIT_QUESTIONS]: "Edit Questions",
    [PERMISSIONS.MANAGE_TESTS]: "Manage Tests",
    [PERMISSIONS.MANAGE_GOALS]: "Manage Goals",
    [PERMISSIONS.VIEW_ANALYTICS]: "View Analytics",
};

export interface UserDoc {
    uid: string;
    email: string;
    username: string;
    displayUsername: string;
    role: UserRole;
    permissions?: string[];
    assignedGoalIds?: string[];
    createdAt: unknown;
}

interface AuthContextValue {
    user: User | null;
    userDoc: UserDoc | null;
    isAdmin: boolean;
    isLoading: boolean;
    /** Returns true if user is admin OR has the specific permission */
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    userDoc: null,
    isAdmin: false,
    isLoading: true,
    hasPermission: () => false,
});

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
                // Use onSnapshot so role/permission changes reflect immediately
                unsubscribeDoc = onSnapshot(doc(db, "users", firebaseUser.uid), 
                    (snap) => {
                        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
                        setIsLoading(false);
                    },
                    (error) => {
                        console.error("Firestore onSnapshot error in AuthContext:", error);
                        setIsLoading(false);
                    }
                );
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

    const hasPermission = useCallback((perm: string): boolean => {
        if (isAdmin) return true;
        return userDoc?.permissions?.includes(perm) ?? false;
    }, [isAdmin, userDoc?.permissions]);

    return (
        <AuthContext.Provider value={{ user, userDoc, isAdmin, isLoading, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
