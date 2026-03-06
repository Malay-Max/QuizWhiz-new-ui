"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { GoalProvider } from "@/contexts/goal-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#111418]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user) return null; // redirecting

    return (
        <GoalProvider>
            <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
                <div className="hidden md:flex">
                    <Sidebar />
                </div>
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <div className="md:hidden p-4 border-b border-surface-border flex items-center justify-between bg-background-dark">
                        <span className="font-bold text-white">QuizWhiz</span>
                        <MobileNav />
                    </div>
                    {children}
                    <footer className="flex-shrink-0 py-2 px-6 border-t border-[#1c2127] text-center text-[11px] text-[#9dabb9]/50 hidden md:block">
                        Created by Malay Layek
                    </footer>
                </div>
            </div>
        </GoalProvider>
    );
}
