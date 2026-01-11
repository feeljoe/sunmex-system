"use client";

import { useRouter } from "next/navigation";

export default function GoBackButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} className=" flex items-center gap-2 px-3 py-2 rounded-xl bg-(--primary) text-white hover:bg-(--tertiary) transition-all duration:300">
      ← Back
    </button>
  );
}
