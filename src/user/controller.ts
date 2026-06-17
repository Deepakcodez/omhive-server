import { db } from "../db/index.js";
import { usersTable } from "../db/schema.js";
import type { User } from "./schema.js";

export const userController = {
    createUser: async ({ userName, fullName, phone }: User) => {
        const user = await db.insert(usersTable).values({
            userName,
            fullName,
            phone,
        }).returning()
        return user
    }
}