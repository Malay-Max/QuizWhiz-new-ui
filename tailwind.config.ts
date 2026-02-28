import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#137fec",
                    hover: "#116cc9",
                    foreground: "#ffffff",
                },
                background: {
                    light: "#f6f7f8",
                    dark: "#101922",
                    DEFAULT: "#101922",
                },
                surface: {
                    dark: "#1c2127",
                    border: "#283039",
                    DEFAULT: "#1c2127",
                },
                text: {
                    main: "#FFFFFF",
                    secondary: "#9dabb9",
                },
            },
            fontFamily: {
                display: ["var(--font-lexend)", "sans-serif"],
                body: ["var(--font-noto)", "sans-serif"],
            },
            borderRadius: {
                lg: "0.5rem",
                md: "calc(0.5rem - 2px)",
                sm: "calc(0.5rem - 4px)",
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
