"use client";

import { useEffect, useMemo, useState } from "react";
import { useList } from "@/utils/useList";

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
    type: "vendor",
    user: "",
    clients: [] as string[],
  });

  /* ---------------- SEARCH ---------------- */

  const [userSearch, setUserSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  /* ---------------- FETCH (VOLATILE) ---------------- */

  const { items: users } = useList<User>("/api/users", {
    search: userSearch,
  });

  const { items: clients } = useList<Client>("/api/clients", {
    search: clientSearch,
  });

  const { items: routes } = useList<Route>("/api/routes");

  /* ---------------- STABLE MAPS ---------------- */

  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [routeMap, setRouteMap] = useState<Record<string, Route>>({});

  /* ---------------- INIT MAPS ---------------- */

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
      clients: route.clients?.map((c: Client) => c._id) ?? [],
    });

    if(route.user?._id) {
      setUserMap(prev => ({
        ...prev,
        [route.user._id]: {
          firstName: route.user.firstName,
          lastName: route.user.lastName,
          userRole: route.user.userRole,
        },
      }));
    }

    route.clients?.forEach((c: Client) =>
      setClientMap(prev => ({ ...prev, [c._id]: c }))
    );
  }, [route]);

  /* ---------------- FILTERS ---------------- */

  const usersByRole = useMemo(() => {
    return users.filter(u => u.userRole === form.type);
  }, [users, form.type]);

  const assignedClientIds = useMemo(() => {
    return Object.values(routeMap).flatMap(r =>
      r.clients?.map(c => c._id) ?? []
    );
  }, [routeMap]);

  const availableClients = useMemo(() => {
    return clients.filter(
      c =>
        !assignedClientIds.includes(c._id) ||
        form.clients.includes(c._id)
    );
  }, [clients, assignedClientIds, form.clients]);

  /* ---------------- ACTIONS ---------------- */

  function selectUser(user: User) {
    setForm(prev => ({ ...prev, user: user._id }));
    setUserMap(prev => ({ ...prev, [user._id]: user }));
    setUserSearch("");
  }

  function addClient(client: Client) {
    if (form.clients.includes(client._id)) return;

    setForm(prev => ({
      ...prev,
      clients: [...prev.clients, client._id],
    }));

    setClientMap(prev => ({ ...prev, [client._id]: client }));
    setClientSearch("");
  }

  function removeClient(id: string) {
    setForm(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c !== id),
    }));
  }

  async function save() {
    const payload = {
      code: form.code,
      type: form.type,
      user: form.user,
      clients: form.type === "vendor" ? form.clients : [],
    };

    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/routes/${route._id}` : "/api/routes";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    onSaved();
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-(--secondary) rounded-xl p-6 w-full max-w-xl max-h-2xl space-y-5">

        <h3 className="text-lg font-semibold">
          {isEdit ? "Edit Route" : "New Route"}
        </h3>

        {/* CODE */}
        <input
          placeholder="Route Code"
          value={form.code}
          onChange={e => setForm({ ...form, code: e.target.value })}
          className="w-full bg-white shadow-xl rounded-xl p-3 mt-5"
          disabled={isEdit}
        />

        {/* TYPE */}
        <div className="flex flex-col mt-5 gap-2">
        <label className="text-sm font-medium">Select route type</label>
        <select
          value={form.type}
          onChange={e =>
            setForm({
              ...form,
              type: e.target.value,
              user: "",
              clients: [],
            })
          }
          className="w-full h-10 bg-white shadow-xl rounded-xl p-3"
          disabled={isEdit}
        >
          <option value="">Select One</option>
          <option value="vendor">Vendor</option>
          <option value="driver">Driver</option>
          <option value="onRoute">OnRoute</option>
        </select>
        </div>

        {/* USER SEARCH */}
        <div className="flex flex-col mt-5 gap-2">
          <label className="text-sm font-medium">Assign User</label>
          <input
            placeholder="Search user..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full bg-white shadow-xl rounded-xl p-3"
          />

          {userSearch && (
            <ul className="bg-white shadow-xl rounded-xl max-h-48 overflow-auto">
              {usersByRole.map(u => (
                <li
                  key={u._id}
                  onClick={() => selectUser(u)}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                >
                  {u.firstName} {u.lastName}
                </li>
              ))}
            </ul>
          )}

          {form.user && (
            <div className="flex mt-2 bg-white space-y-3 p-3 rounded-xl text-md items-center justify-between">
              Assigned:{" "}
              {userMap[form.user]
              ? `${userMap[form.user].firstName} ${userMap[form.user].lastName}`
              : "User Assigned"}

              <button
                onClick={() =>
                  setForm(prev => ({
                    ...prev,
                    user: "",
                  }))
                }
                className="text-red-500 underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* CLIENTS */}
        {form.type === "vendor" && (
          <>
          <div className="flex flex-col mt-5 gap-2">
            <label className="text-sm font-medium">Clients</label>

            <input
              placeholder="Search client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="w-full bg-white shadow-xl rounded-xl p-3"
            />
          </div>
            {clientSearch && (
              <ul className="bg-white shadow-xl rounded-xl max-h-48 overflow-y-auto">
                {availableClients.map(c => (
                  <li
                    key={c._id}
                    onClick={() => addClient(c)}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                  >
                    {c.clientName}
                  </li>
                ))}
              </ul>
            )}

            <ul className="space-y-3 mt-5 max-h-48 overflow-y-auto">
              {form.clients.map(id => (
                <li
                  key={id}
                  className="flex justify-between bg-gray-100 p-3 rounded-xl"
                >
                  {clientMap[id]?.clientName || "Unknown client"}
                  <button
                    onClick={() => removeClient(id)}
                    className="text-red-500"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ACTIONS */}
        <div className="flex justify-between gap-3 pt-4">
          <button onClick={onClose} className="border px-4 py-2 rounded cursor-pointer">
            Cancel
          </button>
          <button
            onClick={save}
            className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer"
            disabled={!form.user}
          >
            Save Route
          </button>
        </div>
      </div>
    </div>
  );
}
