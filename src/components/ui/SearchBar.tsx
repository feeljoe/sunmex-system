"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "./hooks/useDebounce";

type Props = {
    placeholder?:string;
    onSearch: (value:string) => void;
    debounce?: boolean;
};

export function SearchBar({
    placeholder= "Search...",
    onSearch,
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
        <label className="flex items-center w-full bg-white rounded-xl shadow-xl">
            <input 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={placeholder} 
                className="p-2 w-full rounded-xl font-mono"
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 text-gray-500 shrink-0 mx-3 cursor-text">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
        </label>
    );
}