import { ClientsTable } from "@/components/tables/ClientsTable";

export default function ClientsPage() {
    return (
      <div className="flex flex-col flex-1 w-full h-full p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Clients</h1>
      <ClientsTable/>
  </div>
  );
  }