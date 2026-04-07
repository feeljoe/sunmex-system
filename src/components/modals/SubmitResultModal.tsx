"use client";

import { motion, AnimatePresence } from "framer-motion";

type Status = "loading" | "success" | "error";

export default function SubmitResultModal({
  status,
  message,
  onClose,
  collection,
}: {
  status: Status;
  message?: string | null;
  onClose?: () => void;
  collection:string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white w-96 rounded-2xl p-8 flex flex-col items-center gap-6 shadow-xl"
      >
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
            />
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* ✅ Success SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>

              <p className="text-lg font-semibold text-center">
                {message || `${collection} saved successfully`}
              </p>

              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Done
              </button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* ❌ Error SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-16 h-16 text-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>

              <p className="text-lg font-semibold text-center">
                {message || "Something went wrong"}
              </p>

              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Go Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
