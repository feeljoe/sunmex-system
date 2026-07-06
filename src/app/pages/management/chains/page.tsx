import { ChainsTable } from "@/components/tables/ChainsTable";

export default function ChainsPage() {
    return (
      <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Chains</h1>
        <ChainsTable/>
      </div>
    );
  }