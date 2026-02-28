"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth";
import { Eye, EyeOff, UserPlus, BookOpen } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (username.trim().length < 3) { setError("Username must be at least 3 characters."); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) { setError("Username can only contain letters, numbers, and underscores."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        setIsLoading(true);
        try {
            await registerUser(email.trim(), username.trim(), password);
            router.push("/");
        } catch (err: any) {
            const msg: string = err.message ?? "";
            if (msg.includes("email-already-in-use")) setError("An account with this email already exists.");
            else setError(msg || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <BookOpen className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white">Create account</h1>
                <p className="text-[#9dabb9] mt-1 text-sm">Start your learning journey</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#1c2127] border border-[#283039] rounded-2xl p-8 shadow-2xl flex flex-col gap-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                        {error}
                    </div>
                )}

                {/* Email */}
                <div>
                    <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-xl px-4 py-3 placeholder:text-[#9dabb9]/40 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                </div>

                {/* Username */}
                <div>
                    <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        placeholder="your_username"
                        className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-xl px-4 py-3 placeholder:text-[#9dabb9]/40 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    />
                    <p className="text-xs text-[#9dabb9]/60 mt-1.5">Letters, numbers, and underscores only</p>
                </div>

                {/* Password */}
                <div>
                    <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="Min. 6 characters"
                            className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-xl px-4 py-3 pr-11 placeholder:text-[#9dabb9]/40 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9dabb9] hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 mt-1"
                >
                    {isLoading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    {isLoading ? "Creating account…" : "Create Account"}
                </button>

                <p className="text-center text-sm text-[#9dabb9]">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
}
