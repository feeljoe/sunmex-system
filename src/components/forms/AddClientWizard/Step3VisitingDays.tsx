import { useEffect, useState } from "react";

export function Step3VisitingDays({form, setForm}: any) {
    type Frequency = "weekly" | "bi-weekly" | "monthly" | "";

    const [visitingDays, setVisitingDays] = useState<string[]>(form.visitingDays || []);
    const [frequency, setFrequency] = useState<Frequency>(form.frequency || "");
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    useEffect(() => {
        setForm((prev: any) => ({
            ...prev,
            visitingDays,
        }));
    }, [visitingDays, setForm]);

    function handleDayToggle(day:string){
        setVisitingDays(prev =>
            prev.includes(day)
            ? prev.filter(d => d !== day)
            : [...prev, day]
        );
    }

    function handleFrequencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const value = e.target.value as Frequency;
        setFrequency(value);
      
        setForm((prev: any) => ({
          ...prev,
          frequency: value,
        }));
      }
      
    

    return (
        <div className="mb-10">
            <div>
                <label className="block text-xl text-center mt-10 font-bold"> – Visit Frequency –</label>
                <select value={frequency} onChange={handleFrequencyChange} className="w-full h-12 bg-white text-gray-500 p-3 rounded-xl mt-5 cursor-pointer" required>
                    <option value="">Select Frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            <div className="flex flex-col mt-5 justify-center">
                <p className="text-xl text-center font-bold">– Visiting Days –</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                    {DAYS.map(day => (
                        <label key={day} className="flex items-center justify-start bg-white text-gray-500 gap-3 p-3 rounded-xl shadow-xl cursor-pointer hover:bg-gray-50">
                            <input type="checkbox" checked={visitingDays.includes(day)} onChange={() => handleDayToggle(day)} className="cursor-pointer h-5 w-5" />
                            <span>{day}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}