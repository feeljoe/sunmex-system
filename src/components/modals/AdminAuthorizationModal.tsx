"use client";

import { useState } from "react";

export default function AdminAuthorizationModal({
    onAuthorized,
    onClose,
}: {
    onAuthorized: (adminId: string) => void;
    onClose: () => void;
}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const authorize = async () => {
        const res = await fetch("/api/auth/admin-authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
        setError("Invalid admin credentials");
        return;
        }

        const data = await res.json();
        onAuthorized(data.adminId);
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-semibold">
              Admin Authorization Required
            </h3>
    
            {error && <p className="text-red-600">{error}</p>}
    
            <input
              placeholder="Admin username"
              className="w-full border p-2 rounded-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
    
            <input
              type="password"
              placeholder="Password"
              className="w-full border p-2 rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
    
            <div className="flex justify-between gap-3">
              <button 
                onClick={onClose}
                className="bg-gray-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-all duration:300 shadow-xl"
              >
                Cancel
              </button>
              <button
                onClick={authorize}
                className="bg-red-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-red-300 transition-all duration:300 shadow-xl"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      );
}