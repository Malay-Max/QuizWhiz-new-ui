import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/auth-context";

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
        <html lang="en" className="dark">
            <body className={cn("min-h-screen bg-background-light dark:bg-background-dark font-display antialiased")}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
