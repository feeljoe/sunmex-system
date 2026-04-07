// lib/roleAccess.ts
import { Role } from "@/types/roles";

export const ROLE_ROUTES: Record<Role, string[]> = {
  admin: ["/dashboard", "/preorders", "/warehouse", "/drivers", "/sales"],
  vendor: ["/preorders"],
  warehouse: ["/warehouse"],
  driver: ["/drivers"],
  onRoute: ["/sales"],
};
