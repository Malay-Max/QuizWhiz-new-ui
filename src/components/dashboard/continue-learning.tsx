import { Play } from "lucide-react";
import Image from "next/image";

export function ContinueLearning() {
    return (
        <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Continue Learning</h3>
                <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">View all</a>
            </div>

            {/* Item 1 */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#1c232b] p-4 rounded-xl border border-slate-200 dark:border-[#283039] shadow-sm hover:border-primary/30 transition-all">
                <div className="w-full sm:w-32 h-32 sm:h-24 rounded-lg bg-slate-800 shrink-0 relative overflow-hidden">
                    {/* Placeholder for image */}
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">Biology</div>
                </div>
                <div className="flex flex-col flex-1 w-full gap-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Biology 101: Cell Structure</h4>
                            <p className="text-sm text-slate-500 dark:text-[#9dabb9]">12 sets • Last studied 2h ago</p>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-primary font-bold">85%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <div className="w-full bg-slate-200 dark:bg-[#283039] rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-[#9dabb9] w-8">85%</span>
                    </div>
                </div>
                <button className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 bg-slate-100 dark:bg-[#283039] hover:bg-slate-200 dark:hover:bg-[#323b46] text-slate-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0">
                    <Play className="w-5 h-5" />
                    Quiz
                </button>
            </div>

            {/* Item 2 */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#1c232b] p-4 rounded-xl border border-slate-200 dark:border-[#283039] shadow-sm hover:border-primary/30 transition-all">
                <div className="w-full sm:w-32 h-32 sm:h-24 rounded-lg bg-slate-800 shrink-0 relative overflow-hidden">
                    {/* Placeholder for image */}
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">React</div>
                </div>
                <div className="flex flex-col flex-1 w-full gap-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">React Framework</h4>
                            <p className="text-sm text-slate-500 dark:text-[#9dabb9]">5 sets • Last studied yesterday</p>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-primary font-bold">45%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <div className="w-full bg-slate-200 dark:bg-[#283039] rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-[#9dabb9] w-8">45%</span>
                    </div>
                </div>
                <button className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 bg-slate-100 dark:bg-[#283039] hover:bg-slate-200 dark:hover:bg-[#323b46] text-slate-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0">
                    <Play className="w-5 h-5" />
                    Quiz
                </button>
            </div>
        </div>
    );
}
