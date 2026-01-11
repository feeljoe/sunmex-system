"use client";

type RefreshButtonProps = {
    onRefresh: () => void | Promise<void>;
    loading?: boolean;
    label?:string;
}

export function RefreshButton({
    onRefresh,
    loading = false,
    label = "Refresh",
}: RefreshButtonProps) {
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-(--primary) text-white px-4 py-2 rounded-xl hover:bg-(--tertiary) disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`size-6 ${loading? "animate-spin": ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
            </svg>
        </button>
    )
}