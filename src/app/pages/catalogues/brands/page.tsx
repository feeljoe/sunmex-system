import { BrandsTable } from "@/components/tables/BrandsTable";
export default function BrandsPage() {
    return (
        <div className="flex flex-col flex-1 w-full h-full p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white">Brands</h1>
            <BrandsTable/>
        </div>
    );
  }