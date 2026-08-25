"use client";

import { motion, AnimatePresence } from "framer-motion";

export type Status = 
  | "loading" 
  | "loading-warehouse" 
  | "loading-delivery" 
  | "loading-sale" 
  | "success" 
  | "success-warehouse" 
  | "error" 
  | "error-warehouse" 
  | "info";

export default function SubmitResultModal({
  status,
  message,
  onClose,
  collection,
  progressText,
}: {
  status: Status;
  message?: string | null;
  onClose?: () => void;
  collection: string;
  progressText?: string;
}) {
  
  // Group the warehouse states together so they don't unmount during transitions!
  const isWarehouse = status === "loading-warehouse" || status === "success-warehouse" || status === "error-warehouse";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`bg-(--secondary) ${
          status === "loading" ? "w-48 h-48 justify-center" : "w-96 p-8 gap-6"
        } rounded-2xl flex flex-col items-center shadow-xl`}
      >
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              {/* Spinning Loader */}
              <div className="w-40 h-40 rounded-full border-20 border-blue-400 border-t-blue-800 animate-spin" />
            </motion.div>
          )}

          {/* COMBINED SEAMLESS WAREHOUSE ANIMATION */}
          {isWarehouse && (
            <motion.div
              key="warehouse-animation"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                // Tailwind perfectly crossfades these colors when the status changes!
                className={`w-20 h-20 p-2 rounded-full overflow-hidden transition-colors duration-500 ${
                  status === "loading-warehouse"
                    ? "text-blue-800 bg-blue-200"
                    : status === "success-warehouse"
                    ? "text-green-800 bg-green-400"
                    : "text-red-800 bg-red-400"
                }`}
              >
                {/* Back rim of the box */}
                <line x1="4" y1="10" x2="20" y2="10" className="opacity-40" />

                {/* The Animated Item */}
                <motion.g
                  animate={
                    status === "loading-warehouse"
                      ? { y: [-10, 6], opacity: [0, 1, 0] } // Looping drop
                      : status === "error-warehouse"
                      ? { y: [6, -20], opacity: [1, 1, 0] } // Error: Reverses and pops OUT of the box!
                      : { y: 6, opacity: 0 } // Success: Fades away quietly inside the box
                  }
                  transition={
                    status === "loading-warehouse"
                      ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.6, ease: "easeOut" }
                  }
                >
                  <rect x="9" y="2" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
                </motion.g>

                {/* Front of Box (Color smoothly transitions to hide the item) */}
                <path
                  d="M4 10v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9Z"
                  className={`transition-colors duration-500 ${
                    status === "loading-warehouse"
                      ? "fill-blue-200"
                      : status === "success-warehouse"
                      ? "fill-green-400"
                      : "fill-red-400"
                  }`}
                />

                {/* Left Flap */}
                <motion.path
                  animate={{ d: status === "loading-warehouse" ? "M4 10 L1 5" : "M4 10 L12 10" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                
                {/* Right Flap */}
                <motion.path
                  animate={{ d: status === "loading-warehouse" ? "M20 10 L23 5" : "M20 10 L12 10" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />

                {/* Success Checkmark */}
                <motion.path
                  d="M9 14.5l2 2 4-4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: status === "success-warehouse" ? 1 : 0,
                    opacity: status === "success-warehouse" ? 1 : 0,
                  }}
                  transition={{ delay: status === "success-warehouse" ? 0.5 : 0, duration: 0.4 }}
                />

                {/* Error X Mark */}
                <motion.path
                  d="M10 12.5l4 4m0-4l-4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: status === "error-warehouse" ? 1 : 0,
                    opacity: status === "error-warehouse" ? 1 : 0,
                  }}
                  transition={{ delay: status === "error-warehouse" ? 0.5 : 0, duration: 0.4 }}
                />
              </svg>

              <p
                className={`text-lg font-semibold text-center transition-colors duration-500 ${
                  status === "loading-warehouse"
                    ? "text-blue-800"
                    : status === "success-warehouse"
                    ? "text-green-800"
                    : "text-red-800"
                }`}
              >
                {message || (
                  status === "loading-warehouse" ? `${collection} picking items...` : 
                  status === "success-warehouse" ? `${collection} finished picking!` :
                  `${collection} encountered an error.`
                )}
              </p>

              {/* Action Buttons (Smoothly pop in when loading is done) */}
              <div className="h-12 w-full mt-2 flex justify-center">
                <AnimatePresence>
                  {status !== "loading-warehouse" && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={onClose}
                      className={`px-8 py-2 font-bold rounded-lg shadow-md cursor-pointer transition ${
                        status === "success-warehouse"
                          ? "bg-blue-400 text-blue-800 hover:bg-blue-800 hover:text-white"
                          : "bg-gray-400 text-gray-800 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      {status === "success-warehouse" ? "Done" : "Go Back"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STANDARD SUCCESS */}
          {status === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-green-800 bg-green-400 p-2 rounded-full"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-lg font-semibold text-center">{message || `${collection} saved successfully`}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-400 font-bold text-blue-800 rounded-lg shadow-md hover:bg-blue-800 hover:text-white cursor-pointer transition">
                Done
              </button>
            </motion.div>
          )}

          {/* STANDARD ERROR */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-red-800 bg-red-400 p-2 rounded-full"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-lg font-semibold text-center">{message || "Something went wrong"}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 text-gray-800 font-bold bg-gray-400 rounded-lg shadow-md hover:bg-gray-800 hover:text-white cursor-pointer transition">
                Go Back
              </button>
            </motion.div>
          )}

          {/* STANDARD INFO */}
          {status === "info" && (
            <motion.div
              key="info"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-20 h-20 text-yellow-800 bg-yellow-400 p-2 rounded-full"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-lg font-semibold text-center text-gray-800">{message || "Please check your inputs."}</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-yellow-400 text-yellow-800 font-bold rounded-lg hover:bg-yellow-800 hover:text-white transition cursor-pointer shadow-md">
                Fix problems
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}