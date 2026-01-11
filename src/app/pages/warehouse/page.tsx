import Link from "next/link";

export default function WarehousePage() {

    return (
        <div className="flex flex-1 w-full h-full gap-5 p-5">
                <Link href="/pages/warehouse/preorders" className="w-40 h-50 lg:w-50 lg:h-80 bg-(--secondary) rounded-4xl transition-all duration:300 hover:bg-(--quarteary) hover:shadow-2xl hover:-translate-y-2 hover:scale-105 shadow-lg">
                    <div className="flex flex-col items-center justify-center w-full h-full text-2xl lg:text-3xl text-gray-700 hover:text-white">
                        Preorders
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                        </svg>

                    </div>
                </Link>
                <Link href="/pages/warehouse/truckload" className="w-40 h-50 lg:w-50 lg:h-80 bg-white rounded-4xl transition-all duration:300 hover:bg-(--quarteary) hover:shadow-2xl hover:-translate-y-2 hover:scale-105 shadow-lg">
                    <div className="flex flex-col items-center justify-center w-full h-full text-2xl lg:text-3xl text-gray-700 hover:text-white">
                        Truck Load
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                    </div>
                </Link>
            
        </div>
  );
  }