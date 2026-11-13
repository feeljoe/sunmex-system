
"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  brand: any;
  onClose: () => void;
  onUpdated: () => void;
};

type BrandStatus = "active" | "inactive";

export default function EditBrandModal({
  open,
  brand,
  onClose,
  onUpdated,
}: Props) {
  const [name, setName] = useState("");
  const [status, setStatus] =
    useState<BrandStatus>("active");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!brand || !open) return;

    setName(brand.name ?? "");
    setStatus(
      brand.status === "inactive"
        ? "inactive"
        : "active"
    );
    setError("");
    setSuccess("");
  }, [brand, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [open, saving, onClose]);

  if (!open || !brand) return null;

  const originalStatus =
    brand.status === "inactive"
      ? "inactive"
      : "active";

  const changed =
    name.trim() !== String(brand.name ?? "").trim() ||
    status !== originalStatus;

  const saveChanges = async () => {
    if (saving) return;

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Brand name is required.");
      return;
    }

    if (!changed) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: {
        name?: string;
        status?: BrandStatus;
      } = {};

      if (cleanName !== brand.name) {
        payload.name = cleanName;
      }

      if (status !== originalStatus) {
        payload.status = status;
      }

      const response = await fetch(
        `/api/brands/${brand._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
          "Unable to update brand"
        );
      }

      setSuccess("Brand updated successfully.");
      await onUpdated();
      onClose();
    } catch (err: any) {
      setError(
        err.message ?? "Failed to update brand"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${brand.name}`}
        className="flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-(--secondary) shadow-2xl"
      >
        {/* HEADER */}
        <header className="flex shrink-0 items-center justify-between gap-3 bg-(--quarteary) p-3 text-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold opacity-75">
              Brand Management
            </p>

            <h2 className="truncate text-xl font-black">
              Edit Brand
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close brand editor"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-xl font-bold text-white disabled:opacity-50"
          >
            ×
          </button>
        </header>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-900">
              Brand Name
            </span>

            <input
              type="text"
              value={name}
              disabled={saving}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-500"
            />
          </label>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <label
              htmlFor="edit-brand-status"
              className="mb-2 block text-sm font-bold text-gray-900"
            >
              Brand Status
            </label>

            <select
              id="edit-brand-status"
              value={status}
              disabled={saving}
              onChange={(event) =>
                setStatus(
                  event.target.value as BrandStatus
                )
              }
              className={`min-h-11 w-full rounded-xl border p-3 text-sm font-bold outline-none ${
                status === "inactive"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-green-300 bg-green-50 text-green-800"
              }`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Inactive brands and all products belonging
              to them are hidden from the visual preorder
              catalog. Inventory and existing sales are
              not changed.
            </p>
          </div>

          {status === "inactive" && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 p-3">
              <h3 className="text-sm font-bold text-orange-900">
                Brand will be hidden
              </h3>

              <p className="mt-1 text-xs text-orange-800">
                All products under this brand will be
                hidden from the customer-facing catalog
                until you reactivate the brand, even if
                those products individually remain active.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700"
            >
              {success}
            </p>
          )}
        </div>

        {/* ACTIONS */}
        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-gray-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 rounded-xl bg-gray-200 px-4 text-sm font-bold text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving || !changed}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </footer>
      </section>
    </div>
  );
}
