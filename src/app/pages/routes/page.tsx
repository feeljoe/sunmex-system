import { RouteList } from "@/components/tables/RoutesTable";

export default function RoutePage() {

    return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center">Routes</h1>
        <RouteList/>
  </div>
  );
  }