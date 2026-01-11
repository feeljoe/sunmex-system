"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_DEFAULT_ROUTE } from "@/lib/roleRedirect";
import { Role } from "@/types/roles";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault();

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if(res?.error){
      setMessage("Invalid Credentials");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();

    
    if(session?.user?.role) {
      router.replace(ROLE_DEFAULT_ROUTE[session.user.role as Role]);
    }
    
  }

    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
          <form 
          onSubmit={handleSubmit}
          className="bg-(--secondary) p-8 rounded-xl shadow-xl w-96 space-y-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>

            {message && <p className="text-red-500 text-xl">{message}</p>}

            <input
              placeholder="Username"
              className="w-full bg-white shadow-xl p-2 rounded-xl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white shadow-xl p-2 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
  
            <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-all duration:500">
              Sign In
            </button>
          </form>
      </div>
    );
  }
  