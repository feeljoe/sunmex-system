import {LoadRequestsTable } from "@/components/load-requests/LoadRequestsTable";

export default function LoadRequestsPage() {
  return (
    <div className="flex flex-col flex-1 w-full h-full p-5">
        <h1 className="text-4xl font-bold text-center mb-5 dark:text-white">Load Requests</h1>
        <LoadRequestsTable/>
    </div>
  );
  }