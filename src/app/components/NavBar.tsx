import { signOut } from "next-auth/react";
import GoBackButton from "@/components/ui/goBackButton";
export default function Navbar() {
    return (
      <header className="w-full h-15 bg-(--quarteary) shadow flex items-center px-10">
          <div className="flex w-full h-full p-3 justify-between">
          <div className="flex w-full">
          <GoBackButton />
          </div>
          <button className="px-5 py-2 bg-gray-200 rounded-xl hover:bg-red-700 hover:text-white cursor-pointer" onClick={() => signOut({callbackUrl:"/auth/login"})}>
            Logout
          </button>
          </div>
      </header>
    );
  }
  