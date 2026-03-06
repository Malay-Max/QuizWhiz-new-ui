"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";
import { Goal } from "@/lib/schemas";
import { getGoals } from "@/lib/db";

interface GoalContextValue {
    goals: Goal[];
    activeGoalId: string | null;
    activeGoal: Goal | null;
    setActiveGoalId: (id: string) => void;
    isLoading: boolean;
}

const GoalContext = createContext<GoalContextValue>({
    goals: [],
    activeGoalId: null,
    activeGoal: null,
    setActiveGoalId: () => { },
    isLoading: true,
});

export function GoalProvider({ children }: { children: ReactNode }) {
    const { user, userDoc, isAdmin, isLoading: authLoading } = useAuth();
    const [allGoals, setAllGoals] = useState<Goal[]>([]);
    const [activeGoalId, setActiveGoalIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load goals
    useEffect(() => {
        if (authLoading || !user) return;

        (async () => {
            try {
                const fetchedGoals = await getGoals();

                // Admins see all goals; users see only their assigned goals
                const assignedIds: string[] = (userDoc as any)?.assignedGoalIds ?? [];
                const visibleGoals = isAdmin
                    ? fetchedGoals
                    : fetchedGoals.filter(g => assignedIds.includes(g.id!));

                setAllGoals(visibleGoals);

                // Restore active goal from localStorage, or pick first available
                const stored = localStorage.getItem(`quizwhiz_activeGoal_${user.uid}`);
                if (stored && visibleGoals.some(g => g.id === stored)) {
                    setActiveGoalIdState(stored);
                } else if (visibleGoals.length > 0) {
                    setActiveGoalIdState(visibleGoals[0].id!);
                }
            } catch (err) {
                console.error("Failed to load goals:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [user, userDoc, isAdmin, authLoading]);

    const setActiveGoalId = (id: string) => {
        setActiveGoalIdState(id);
        if (user) {
            localStorage.setItem(`quizwhiz_activeGoal_${user.uid}`, id);
        }
    };

    const activeGoal = allGoals.find(g => g.id === activeGoalId) ?? null;

    return (
        <GoalContext.Provider value={{ goals: allGoals, activeGoalId, activeGoal, setActiveGoalId, isLoading }}>
            {children}
        </GoalContext.Provider>
    );
}

export function useGoal() {
    return useContext(GoalContext);
}
