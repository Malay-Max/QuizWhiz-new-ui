"use client";

import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerProps {
    duration: number; // in seconds
    onTimeUp: () => void;
    isRunning: boolean;
    onReset?: (resetFn: () => void) => void;
}

export function Timer({ duration, onTimeUp, isRunning }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        setTimeLeft(duration);
    }, [duration]);

    useEffect(() => {
        if (!isRunning || timeLeft <= 0) return;

        const intervalId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    // Schedule outside state updater to avoid "setState during render" warning
                    setTimeout(onTimeUp, 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isRunning, timeLeft, onTimeUp]);

    const progress = (timeLeft / duration) * 100;
    const isCritical = timeLeft <= 5;

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
            isCritical
                ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        )}>
            <TimerIcon className="w-5 h-5" />
            <span className="font-mono font-bold text-lg tabular-nums">
                00:{timeLeft.toString().padStart(2, '0')}
            </span>
        </div>
    );
}
