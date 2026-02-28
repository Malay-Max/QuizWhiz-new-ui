import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    iconColorClass: string;
    subtext?: string;
    onClick?: () => void;
}

export function StatCard({
    label,
    value,
    trend,
    trendUp,
    icon: Icon,
    iconColorClass,
    subtext,
    onClick
}: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-white dark:bg-[#1c232b] p-6 rounded-xl border border-slate-200 dark:border-[#283039] shadow-sm flex flex-col justify-between group hover:border-primary/50 transition-colors cursor-pointer",
                onClick && "cursor-pointer"
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2 rounded-lg bg-opacity-10", iconColorClass.replace("text-", "bg-").replace("500", "500/10"), iconColorClass)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <p className="text-slate-500 dark:text-[#9dabb9] text-sm font-medium mb-1">{label}</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
                    {trend && (
                        <span className={cn("text-sm font-medium mb-1 flex items-center", trendUp ? "text-emerald-500" : "text-red-500")}>
                            {trend}
                        </span>
                    )}
                </div>
                {subtext && <p className="text-red-400 text-xs mt-1">{subtext}</p>}
            </div>
        </div>
    );
}
