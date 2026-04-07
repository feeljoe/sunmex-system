import Link from "next/link";

export default function ReportsPage() {

    return (
        <div className="flex flex-1 w-full h-full gap-5 p-5">
                <Link href="/pages/reports/general" className="w-40 h-50 lg:w-50 lg:h-80 bg-(--secondary) rounded-4xl transition-all duration:300 hover:bg-(--quarteary) hover:shadow-2xl hover:-translate-y-2 hover:scale-105 shadow-lg">
                    <div className="flex flex-col items-center justify-center w-full h-full text-2xl lg:text-3xl text-gray-700 hover:text-white">
                        General
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                    </div>
                </Link>
        </div>
  );
  }