"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logActivityAction } from "@/app/actions/analytics-actions";
import { usePathname } from "next/navigation";

const PING_INTERVAL_MS = 30000; // Send heartbeat every 30 seconds
const IDLE_TIMEOUT_MS = 60000;  // Consider idle after 1 minute of no interaction

export function ActivityTracker() {
    const { user } = useAuth();
    const pathname = usePathname();

    const lastActiveTime = useRef<number>(Date.now());
    const accumulatedActiveSeconds = useRef<number>(0);
    const lastPingTime = useRef<number>(Date.now());

    useEffect(() => {
        if (!user) return;

        const updateActivity = () => {
            lastActiveTime.current = Date.now();
        };

        // Listen for activity events
        window.addEventListener("mousemove", updateActivity, { passive: true });
        window.addEventListener("keydown", updateActivity, { passive: true });
        window.addEventListener("touchstart", updateActivity, { passive: true });
        window.addEventListener("scroll", updateActivity, { passive: true });
        window.addEventListener("click", updateActivity, { passive: true });

        const interval = setInterval(() => {
            const now = Date.now();

            // If user hasn't interacted in IDLE_TIMEOUT_MS, they are considered idle.
            // Only add time if they were active since the last check.
            const timeSinceLastActive = now - lastActiveTime.current;
            const timeSinceLastPing = now - lastPingTime.current;

            if (timeSinceLastActive < IDLE_TIMEOUT_MS) {
                accumulatedActiveSeconds.current += (timeSinceLastPing / 1000);
            }

            lastPingTime.current = now;

            // Send heartbeat if we have accumulated time
            if (accumulatedActiveSeconds.current >= (PING_INTERVAL_MS / 1000)) {
                const secondsToLog = Math.floor(accumulatedActiveSeconds.current);
                accumulatedActiveSeconds.current -= secondsToLog; // Keep fractionals

                logActivityAction(user.uid, secondsToLog).catch(console.error);
            }

        }, Math.min(PING_INTERVAL_MS, 5000)); // Check frequently, ping every 30s

        return () => {
            clearInterval(interval);
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
            window.removeEventListener("touchstart", updateActivity);
            window.removeEventListener("scroll", updateActivity);
            window.removeEventListener("click", updateActivity);
        };
    }, [user, pathname]); // Re-bind if user or pathname changes, but interval keeps running

    return null; // Invisible global tracker
}
