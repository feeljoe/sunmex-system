import { signOut } from "next-auth/react";
import GoBackButton from "@/components/ui/goBackButton";

export default function Navbar({isAdmin}: {isAdmin: boolean;}) {
    return (
      <header className="sticky top-0 z-30 w-full shrink-0 bg-(--quarteary) pt-[env(safe-area-inset-top)] shadow">
          <div className={`flex h-10 w-full items-center justify-between ${isAdmin === true ? "pl-16 lg:pl-10" : "pl-3 lg:pl-10"} pr-3`}>
          <GoBackButton />
          <button 
            className="shrink-0 rounded-xl bg-gray-200 px-3 py-1 text-gray-900 transition-colors hover:bg-red-700 hover:text-white cursor-pointer" 
            onClick={() => signOut({callbackUrl:"/auth/login"})}
          >
            Logout
          </button>
          </div>
      </header>
    );
  }