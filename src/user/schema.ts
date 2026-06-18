import { z } from "zod";

export const UserSchema = z.object({
    userName: z.string().min(3),
    fullName: z.string().min(3),
    phone: z.string().min(10).max(12),
})


export const LoginSchema = z.object({
    userName: z.string().min(3),
    startTime: z.string().min(3),
    hostname: z.string().min(3),
    systemUsername: z.string().min(3),
    os: z.string().min(3),
})

export type User = z.infer<typeof UserSchema>
export type Login = z.infer<typeof LoginSchema>