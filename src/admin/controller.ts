import { eq , } from "drizzle-orm"
import { db } from "../db/index.js"
import { usersTable } from "../db/schema.js"
import type { User } from "../user/schema.js"


export const adminController = {
    createUser: async ({ userName, fullName, phone }: User) => {
        try {
            const [user] = await db.insert(usersTable).values({
                userName,
                fullName,
                phone,
            }).returning()
            if (!user) {
                throw new Error("Failed to create user")
            }
            return user
        } catch (error: any) {
            throw new Error(error.message)
        }
    },
    allUser: async () => {
        try {
            const user = await db.select().from(usersTable)
            return user
        } catch (error: any) {
            throw new Error(error.message)
        }
    },
    activateUser: async ({ id }: { id: string }) => {
        try {
            const [user] = await db.update(usersTable).set({
                isActive: true,
            }).where(eq(usersTable.id, id)).returning()
            if (!user) {
                throw new Error("Failed to activate user")
            }
            return user
        } catch (error: any) {
            throw new Error(error.message)
        }
    },
    deActivateUser: async ({ id }: { id: string }) => {
        try {
            const [user] = await db.update(usersTable).set({
                isActive: false,
            }).where(eq(usersTable.id, id)).returning()
            if (!user) {
                throw new Error("Failed to deactivate user")
            }
            return user
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

}