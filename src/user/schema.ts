import { z } from "zod";

export const UserSchema = z.object({
    userName: z.string().min(3),
    fullName: z.string().min(3),
    phone: z.string().min(10).max(12),
})

export type User = z.infer<typeof UserSchema>