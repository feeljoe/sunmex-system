import { z } from 'zod';

export const UserSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    userRole: z.enum(["admin", "vendor", "driver", "warehouse", "owner"]),
    username: z.string().min(3),
    password: z.string().min(6),
    route: z.string().optional().nullable(),
});

export const UserUpdateSchema = UserSchema.partial().extend({
    password: z.string().optional(),
});