import { MoreHorizontal, Monitor, TestTube, Brain, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for now
const CATEGORIES = [
    { id: '1', name: 'Computer Science', count: '18 Quizzes', courses: '4 Courses', icon: Monitor, color: 'text-blue-500' },
    { id: '2', name: 'Biology & Nature', count: '12 Quizzes', courses: '2 Courses', icon: TestTube, color: 'text-emerald-500' },
    { id: '3', name: 'Psychology', count: '8 Quizzes', courses: '1 Course', icon: Brain, color: 'text-purple-500' },
];

export function CategoryList() {
    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Browse Subjects</h3>
                <div className="flex gap-2">
                    {/* Layout toggles can go here */}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map((cat) => (
                    <div key={cat.id} className="group relative overflow-hidden bg-white dark:bg-[#1c232b] rounded-xl border border-slate-200 dark:border-[#283039] p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-slate-400 hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
                        </div>
                        <div className={cn("mb-4 w-12 h-12 rounded-lg flex items-center justify-center bg-opacity-20", cat.color.replace("text-", "bg-").replace("500", "500/20"), cat.color)}>
                            <cat.icon className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{cat.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-[#9dabb9] mb-4">{cat.count} • {cat.courses}</p>
                        <button className="w-full py-2 bg-slate-100 dark:bg-[#283039] text-slate-900 dark:text-white text-sm font-medium rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                            View Topics
                        </button>
                    </div>
                ))}
                {/* Add New */}
                <div className="flex flex-col items-center justify-center bg-transparent border-2 border-dashed border-[#283039] rounded-xl p-5 hover:border-primary/50 hover:bg-[#283039]/30 transition-all cursor-pointer">
                    <div className="mb-3 w-12 h-12 rounded-full bg-[#283039] text-[#9dabb9] flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-medium text-slate-500 dark:text-[#9dabb9]">New Category</h4>
                </div>
            </div>
        </section>
    );
}
