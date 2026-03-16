import type { Metadata } from "next";
import "./globals.css";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";
import { ActivityTracker } from "@/components/analytics/activity-tracker";
import { Geist } from "next/font/google";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
    title: "QuizWhiz - AI Learning Platform",
    description: "Generate quizzes, study, and master topics with AI and Spaced Repetition.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
            <body className={cn("min-h-screen bg-background-light dark:bg-background-dark font-display antialiased")}>
                <AuthProvider>
                    <ActivityTracker />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
