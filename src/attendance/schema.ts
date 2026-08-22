import z from "zod";

export const heartbeatInputSchema = z.object({
    attendanceId: z.uuid().min(1).max(36),
    userId: z.uuid().min(1).max(36),
})