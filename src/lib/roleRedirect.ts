import { Role } from "@/types/roles";

export const ROLE_DEFAULT_ROUTE: Record<Role, string> = {
  admin: "/pages/dashboard",
  vendor: "/pages/sales",
  warehouse: "/pages/warehouse",
  driver: "/pages/drivers",
  onRoute: "/pages/sales",
};
