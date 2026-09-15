"use client";

import { useEffect, useMemo, useState } from "react";
import { useList } from "@/utils/useList";
import AsyncSearchSelect from "../ui/AsyncSearchSelect";
import SubmitResultModal from "../modals/SubmitResultModal";

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  userRole: string;
};

type Client = {
  _id: string;
  clientName: string;
};

type Route = {
  _id: string;
  clients?: Client[];
};

export default function RouteFormModal({
  route,
  onClose,
  onSaved,
}: any) {
  const isEdit = Boolean(route);

  /* ---------------- FORM ---------------- */
  const [form, setForm] = useState({
    code: "",
    type: "",
    user: "",
    tempUsers: [] as string[],
    clients: [] as string[],
    active: true,
  });

  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");

  /* ---------------- STABLE MAPS ---------------- */
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [routeMap, setRouteMap] = useState<Record<string, Route>>({});

  /* ---------------- FETCH ---------------- */
  // We ONLY fetch routes so we know which clients are already assigned globally!
  const { items: routes } = useList<Route>("/api/routes", { limit: 1000 });

  useEffect(() => {
    routes.forEach(r =>
      setRouteMap(prev => ({ ...prev, [r._id]: r }))
    );
  }, [routes]);

  /* ---------------- EDIT MODE ---------------- */
  useEffect(() => {
    if (!route) return;

    setForm({
      code: route.code,
      type: route.type,
      user: route.user?._id ?? "",
      tempUsers: route.tempUsers?.map((u: User) => u._id) ?? [],
      clients: route.clients?.map((c: Client) => c._id) ?? [],
      active: route.active ?? true,
    });

    if (route.user?._id) {
      setUserMap(prev => ({ ...prev, [route.user._id]: route.user }));
    }

    if (route.tempUsers?.length) {
      route.tempUsers.forEach((u: User) => {
        setUserMap(prev => ({ ...prev, [u._id]: u }));
      });
    }

    route.clients?.forEach((c: Client) =>
      setClientMap(prev => ({ ...prev, [c._id]: c }))
    );
  }, [route]);

  /* ---------------- FILTERS ---------------- */
  const assignedClientIds = useMemo(() => {
    return Object.values(routeMap).flatMap(r =>
      r.clients?.map(c => c._id) ?? []
    );
  }, [routeMap]);

  /* ---------------- ACTIONS ---------------- */
  function selectUser(user: User) {
    setForm(prev => ({ ...prev, user: user._id }));
    setUserMap(prev => ({ ...prev, [user._id]: user }));
  }

  function addTempUser(user: User) {
    if (form.tempUsers.includes(user._id)) return;
    setForm(prev => ({ ...prev, tempUsers: [...prev.tempUsers, user._id] }));
    setUserMap(prev => ({ ...prev, [user._id]: user }));
  }

  function removeTempUser(id: string) {
    setForm(prev => ({ ...prev, tempUsers: prev.tempUsers.filter(u => u !== id) }));
  }

  function addClient(client: Client) {
    if (form.clients.includes(client._id)) return;
    setForm(prev => ({ ...prev, clients: [...prev.clients, client._id] }));
    setClientMap(prev => ({ ...prev, [client._id]: client }));
  }

  function removeClient(id: string) {
    setForm(prev => ({ ...prev, clients: prev.clients.filter(c => c !== id) }));
  }

  async function save() {
    try {
      setSubmitStatus("loading");
    const payload = {
      code: form.code,
      type: form.type,
      user: form.user,
      tempUsers: form.tempUsers,
      active: form.active,
      clients: form.type === "vendor" ? form.clients : [],
    };

    const method = isEdit ? "PATCH" : "POST";
    const url = isEdit ? `/api/routes/${route._id}` : "/api/routes";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) setSubmitStatus("error");
    setSubmitStatus("success");
    setMessage(`Route ${isEdit ? "updated": "created"} successfully`);
    } catch (err: any) {
      setSubmitStatus("error");
      setMessage(err);
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-(--secondary) overflow-hidden rounded-xl w-full max-w-[98vw] md:max-w-5xl min-h-[80vh] md:min-h-[60vh] max-h-[85vh] flex flex-col shadow-2xl">

        <div className="flex justify-between items-center p-3 bg-(--tertiary) shrink-0">
          <h2 className="text-lg lg:text-2xl font-semibold">
            {isEdit ? "Edit Route" : "New Route"}
          </h2>
          <button onClick={onClose} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-300 hover:text-red-800 cursor-pointer transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`flex-1 overflow-auto p-2 flex flex-col md:grid ${form.type === "vendor" ? "md:grid-cols-2" : "md:flex"} gap-2`}>

          {/* LEFT COLUMN: Code, Type, Users */}
          <div className="flex flex-col gap-2">

            {/* CODE + ROUTE TYPE */}
            <div className="flex flex-row gap-2">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-col md:flex-row">
                  <label className="text-sm font-medium">Route Code</label>
                  {isEdit && <span className="text-sm font-medium text-gray-500">(Current: {route.code})</span>}
                </div>
                <input
                  placeholder="Route Code"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full h-10 bg-white shadow-xl rounded-xl p-3 outline-none"
                  disabled={isEdit}
                />
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-col md:flex-row">
                {isEdit && <label className="text-sm text-(--secondary) font-medium md:hidden">|</label>}
                  <label className="text-sm font-medium">Select Route Type</label>
                </div>
                <div className="w-full h-10 bg-white shadow-xl rounded-xl">
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value, user: "", tempUsers: [], clients: [] })}
                    className="w-full h-full p-2 bg-transparent outline-none cursor-pointer"
                    disabled={isEdit}
                  >
                    <option value="">Select One</option>
                    <option value="vendor">Vendor</option>
                    <option value="driver">Driver</option>
                    <option disabled value="onRoute">OnRoute</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MAIN USER SEARCH */}
            <div className="flex flex-col gap-2 w-full mt-2">
              <label className="text-sm font-medium">Assign Main User {`${route ? `(current: ${route.user?.firstName} ${route.user?.lastName})` : ""}`}</label>

              <AsyncSearchSelect
                endpoint={`/api/users?userRole=${form.type}`}
                placeholder="Search user..."
                onChange={selectUser}
                clearOnSelect={true}
                getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                filterOption={(u) => u._id !== form.user} // Hides currently selected user
              />

              {form.user && (
                <div className="flex bg-white mt-2 p-2 shadow-sm rounded-xl text-md items-center justify-between border border-gray-100">
                  <span className="font-bold capitalize">
                    {userMap[form.user] ? `${userMap[form.user].firstName} ${userMap[form.user].lastName}` : "User Assigned"}
                  </span>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                      className={`${form.active ? "bg-yellow-400 text-yellow-800 hover:bg-yellow-800" : "bg-green-400 text-green-800 hover:bg-green-800"} px-3 py-1 font-bold rounded-xl transition-colors cursor-pointer hover:text-white shadow-sm`}
                    >
                      {form.active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => setForm(prev => ({ ...prev, user: "" }))} className="bg-red-400 font-bold text-red-800 hover:text-white hover:bg-red-800 px-3 py-1 rounded-xl transition-colors cursor-pointer shadow-sm">
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TEMP USERS SEARCH */}
            {form.user && (
              <div className="flex flex-col gap-2 w-full mt-2">
                <label className="text-sm font-medium">Assign Temp User(s)</label>

                <AsyncSearchSelect
                  endpoint={`/api/users?userRole=${form.type}`}
                  placeholder="Search temp user..."
                  onChange={addTempUser}
                  clearOnSelect={true}
                  getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                  filterOption={(u) => u._id !== form.user && !form.tempUsers.includes(u._id)} // Hides main user and already added temp users
                />

                {form.tempUsers.length > 0 && (
                  <ul className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {form.tempUsers.map(id => (
                      <li key={id} className="flex bg-white shadow-sm p-2 rounded-xl text-md items-center justify-between border border-gray-100 capitalize">
                        <span className="font-semibold text-gray-600">
                          {userMap[id] ? `${userMap[id].firstName} ${userMap[id].lastName}` : "Unknown"}
                        </span>
                        <button onClick={() => removeTempUser(id)} className="bg-red-400 text-red-800 hover:text-white hover:bg-red-800 px-2 py-1 font-bold text-sm rounded-xl transition-colors cursor-pointer">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: CLIENTS */}
          {form.type === "vendor" && (
              <div className="flex flex-col h-64 md:h-200 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-2 w-full shrink-0">
                  <label className="text-sm font-medium">Assigned Clients ({form.clients.length})</label>

                  <AsyncSearchSelect
                    endpoint="/api/clients"
                    placeholder="Search client..."
                    onChange={addClient}
                    clearOnSelect={true}
                    getOptionLabel={(c) => c.clientName}
                    filterOption={(c) => !assignedClientIds.includes(c._id) || form.clients.includes(c._id)} // Prevents stealing clients assigned elsewhere
                  />
                </div>

                <ul className="space-y-2 mt-2 flex-1 overflow-y-auto">
                  {form.clients.map(id => (
                    <li key={id} className="flex justify-between items-center bg-white shadow-sm border border-gray-100 p-2 rounded-xl capitalize font-semibold">
                      {clientMap[id]?.clientName?.toLowerCase() || "Unknown client"}
                      <button onClick={() => removeClient(id)} className="py-1 px-2 font-bold rounded-xl bg-red-400 text-red-800 hover:bg-red-800 hover:text-white cursor-pointer transition-colors">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between p-2">
          <button onClick={onClose} className="bg-gray-300 text-gray-700 font-bold hover:text-white hover:bg-gray-700 p-2 rounded-xl cursor-pointer transition-colors shadow-sm">
            Cancel
          </button>
          <button onClick={save} disabled={!form.user} className="bg-blue-400 text-blue-800 hover:text-white font-bold hover:bg-blue-800 p-2 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Save Route
          </button>
        </div>
      </div>
      {submitStatus && (
    <SubmitResultModal
    status={submitStatus}
    onClose={() => {
      if(submitStatus === "success"){
        onSaved();
      }
      setSubmitStatus(null);
    }}
    message={message}
    collection="Route"
  />
)}
    </div>
  );
}