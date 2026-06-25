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
    timezone: z.string()
})

export const isLoggedInSchema = z.object({
    userId: z.string().min(1),
    date: z.string().min(1),
})

export const MonthAttendanceSchema = z.object({
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number(),
    userId: z.string().uuid(),
})

export type User = z.infer<typeof UserSchema>
export type Login = z.infer<typeof LoginSchema>
export type IsLoggedIn = z.infer<typeof isLoggedInSchema>