"use client";

import { useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useState } from "react";

export function MobileNav() {
    const [open, setOpen] = useState(false);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            {/* Hamburger trigger */}
            <button
                onClick={() => setOpen(true)}
                className="p-2 text-[#9dabb9] hover:text-white transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Slide-in drawer */}
            <div
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#111418] border-r border-[#283039] shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/5 transition-colors z-10"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Sidebar contents — clicking a nav link closes the drawer */}
                <div onClick={() => setOpen(false)} className="h-full">
                    <Sidebar />
                </div>
            </div>
        </>
    );
}
