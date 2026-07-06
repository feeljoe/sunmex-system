
import { UsersTable } from "@/components/tables/UsersTable";

export default function UsersPage() {

    return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Users</h1>
        <UsersTable/>
  </div>
  );
  }
  