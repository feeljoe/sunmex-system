import { signOut } from "next-auth/react";
export default function Navbar() {
    return (
      <header className="w-full h-15 bg-(--quarteary) shadow flex items-center px-4">
          <div className="flex w-full h-full p-3 justify-end">
          <button className="px-5 py-2 bg-gray-200 rounded-xl hover:bg-red-700 hover:text-white" onClick={() => signOut({callbackUrl:"/auth/login"})}>
            Logout
          </button>
          </div>
      </header>
    );
  }
  