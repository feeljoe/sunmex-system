"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROLE_DEFAULT_ROUTE } from "@/lib/roleRedirect";
import { ROLE_ROUTES } from "@/lib/roleAccess";
import { Role } from "@/types/roles";

export default function GoBackButton() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGoBack = () => {
    const role = session?.user?.role;

    if (!role) {
      router.push("/auth/login");
      return;
    }

    // If browser has history
    if (window.history.length > 1) {
      router.back();
      return;
    }

    // Fallback to default route
    const defaultRoute = ROLE_DEFAULT_ROUTE[role as Role];
    router.push(defaultRoute);
  };

  return (
    <button
      onClick={handleGoBack}
      className="flex items-center px-3 py-2 rounded-xl bg-(--primary) text-white hover:bg-(--tertiary) transition-all duration-300 cursor-pointer"
    >
      Go Back
    </button>
  );
}
