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
        <div className="flex w-full bg-white rounded-xl shadow-xl">
            <input 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={placeholder} 
                className="p-2 w-full rounded-xl font-mono"
            />
        </div>
    );
}