
import DriverPreordersTable from "@/components/tables/DriverPreordersTable";

export default function DriversPage() {
  return (
    <div className="flex flex-1 flex-col w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center">Driver Routes</h1>
        
        <DriverPreordersTable/>
    </div>
  );
  }