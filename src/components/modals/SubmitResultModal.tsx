"use client";

import { motion, AnimatePresence } from "framer-motion";

type Status = "loading" | "success" | "error" | "info";

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
        className={`bg-(--secondary) ${status === "loading" ? "w-48 h-48 justify-center" : "w-96 p-8 gap-6"} rounded-2xl flex flex-col items-center shadow-xl`}
      >
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="w-40 h-40 rounded-full border-20 border-blue-400 border-t-blue-800 animate-spin"
            />
          )}
          

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Success state */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-green-800 bg-green-400 p-2 rounded-full"
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
                className="mt-4 px-6 py-2 bg-blue-400 font-bold text-blue-800 rounded-lg shadow-md hover:bg-blue-800 hover:text-white cursor-pointer transition"
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
              {/* Error state */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-red-800 bg-red-400 p-2 rounded-full"
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
                className="mt-4 px-6 py-2 text-gray-800 font-bold bg-gray-400 rounded-lg shadow-md hover:bg-gray-800 hover:text-white cursor-pointer transition"
              >
                Go Back
              </button>
            </motion.div>
          )}

          {/*Info State */}
          {status === "info" && (
            <motion.div
              key="info"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Info/Warning SVG */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-20 h-20 text-yellow-800 bg-yellow-400 p-2 rounded-full"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>

              <p className="text-lg font-semibold text-center text-gray-800">
                {message || "Please check your inputs."}
              </p>

              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-yellow-400 text-yellow-800 font-bold rounded-lg hover:bg-yellow-800 hover:text-white transition cursor-pointer shadow-md"
              >
                Fix problems
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
