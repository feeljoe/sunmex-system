"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "./hooks/useDebounce";

type Props = {
    placeholder?:string;
    onSearch: (value:string) => void;
    button?: boolean;
    debounce?: boolean;
};

export function SearchBar({
    placeholder= "Search...",
    onSearch,
    button = false,
    debounce = true,
}: Props) {
    const [value, setValue] = useState("");
    const debouncedValue = useDebounce(value);

    useEffect(() => {
        if(debounce){
            if(debouncedValue !== undefined) {
                onSearch(debouncedValue);
            }
        }
    }, [debouncedValue, debounce, onSearch]);

    return (
        <div className="flex gap-4 w-full bg-white rounded-xl shadow-xl">
            <input 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={placeholder} 
                className="flex-1 rounded-xl px-4 py-2"
            />
            {button && (
                <button
                    onClick={() => onSearch(value)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                    Search
                </button>
            )}
        </div>
    );
}