"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROLE_ROUTES } from "@/lib/roleAccess";
import { useEffect } from "react";
import { Role } from "@/types/roles";

export default function RoleGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const role = session?.user?.role as Role;
    const allowedRoutes = ROLE_ROUTES[role];

    if (!allowedRoutes.some((route: string) => pathname.startsWith(route))) {
      router.replace(allowedRoutes[0]);
    }
  }, [pathname, session, status, router]);

  if (status === "loading") return null;

  return <>{children}</>;
}
