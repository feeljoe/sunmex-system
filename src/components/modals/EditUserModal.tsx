"use client";

import { useState } from "react";

export function EditUserModal({ user, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    userRole: user.userRole,
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4">

        <h2 className="text-lg lg:text-2xl font-semibold text-center p-2">Edit User</h2>

        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
            <label className="font-bold">First Name: </label>
            <input
                type="text"
                className="bg-white rounded-xl p-2"
                placeholder="First Name"
                value={form.firstName}
                onChange={e => updateField("firstName", e.target.value)}
            />
            </div>
            <div className="flex flex-col">
                <label className="font-bold">Last Name</label>
                <input
                    type="text"
                    className="bg-white rounded-xl p-2"
                    placeholder="Last Name"
                    value={form.lastName}
                    onChange={e => updateField("lastName", e.target.value)}
                />
          </div>
          <div className="flex flex-col">
            <label className="font-bold">Username</label>
            <input
                type="text"
                className="bg-white rounded-xl p-2"
                placeholder="Username"
                value={form.username}
                onChange={e => updateField("username", e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="font-bold">User Role</label>
            <select
                className="bg-white rounded-xl p-2 h-10"
                value={form.userRole}
                onChange={e => updateField("userRole", e.target.value)}
            >
                <option value="admin">Admin</option>
                <option value="vendor">Vendor</option>
                <option value="driver">Driver</option>
                <option value="warehouse">Warehouse</option>
                <option value="onRoute">On Route</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="font-bold">Email</label>
          <input 
            className="bg-white rounded-xl p-2"
            placeholder="Email"
            value={form.email}
            onChange={e => updateField("email", e.target.value)}
          />
          </div>
          <div className="flex flex-col">
            <label className="font-bold">Phone Number</label>
          <input
            className="bg-white rounded-xl p-2"
            placeholder="Phone Number"
            value={form.phoneNumber}
            onChange={e => updateField("phoneNumber", e.target.value)}
          />
            </div>
        </div>
        <div className="flex flex-col">
                <label className="font-bold">Password</label>
                <input
            className="bg-white p-2 rounded-xl w-full"
            type="password"
            placeholder="New Password (leave blank to keep current)"
            value={form.password}
            onChange={e => updateField("password", e.target.value)}
          />
            </div>

        <div className="flex justify-between gap-4 pt-4">
          <button
            className="px-4 py-2 rounded-xl bg-gray-300 text-white cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
            onClick={submit}
            disabled={loading}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
