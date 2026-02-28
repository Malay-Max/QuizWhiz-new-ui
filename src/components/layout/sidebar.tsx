"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Sparkles, Layers, BookOpen, BrainCircuit, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { logoutUser } from "@/lib/auth";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { userDoc, isAdmin } = useAuth();

    // Base nav for all users
    const baseNavItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Review", href: "/review", icon: Layers },
    ];

    // Admin-only nav items
    const adminNavItems = [
        { name: "Generate", href: "/generate-questions", icon: Sparkles },
        { name: "Manage", href: "/quiz/manage", icon: BookOpen },
    ];

    // Manage questions is visible to everyone (for reading), but we show the full item for admins
    // and a read-only version for regular users (quiz browsing)
    const navItems = isAdmin
        ? [baseNavItems[0], ...adminNavItems, baseNavItems[1]]
        : [
            ...baseNavItems,
            { name: "Question Bank", href: "/quiz/manage", icon: BookOpen }, // read-only
        ];

    const handleLogout = async () => {
        await logoutUser();
        router.replace("/login");
    };

    return (
        <aside className="w-64 h-full bg-[#111418] border-r border-[#283039] flex flex-col justify-between shrink-0">
            <div className="p-4 flex flex-col gap-6">
                {/* Brand */}
                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 text-primary">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-lg font-bold tracking-tight">QuizWhiz</h1>
                        <p className="text-[#9dabb9] text-xs">A Malay Layek Creation</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href + item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                    isActive ? "bg-primary/10 text-primary" : "text-[#9dabb9] hover:bg-[#283039] hover:text-white"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 flex flex-col gap-2 border-t border-[#283039]">
                {/* Admin badge */}
                {isAdmin && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Admin</span>
                    </div>
                )}

                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {userDoc?.displayUsername?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-none truncate">
                            {userDoc?.displayUsername ?? "User"}
                        </p>
                        <p className="text-[#9dabb9] text-xs mt-1 truncate">{userDoc?.email ?? ""}</p>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9dabb9] hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
