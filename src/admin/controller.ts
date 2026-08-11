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
    


}