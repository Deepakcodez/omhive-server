import { Hono } from "hono";
import { createUser, findUserByEmail, findUserById, listUsers, toPublicUser, USER_ROLES, verifyUserPassword, } from "../models/user.model.js";
export const userRoutes = new Hono();
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isRole = (value) => typeof value === "string" && USER_ROLES.includes(value);
userRoutes.post("/register", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isObject(body)) {
        return c.json({ message: "Invalid request body" }, 400);
    }
    const { name, email, password, role } = body;
    if (typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string") {
        return c.json({ message: "Name, email, and password are required" }, 400);
    }
    if (role !== undefined && !isRole(role)) {
        return c.json({ message: "Role must be user or admin" }, 400);
    }
    try {
        const user = await createUser({
            name: name.trim(),
            email: email.trim(),
            password,
            role,
        });
        return c.json({ message: "User registered", user: toPublicUser(user) }, 201);
    }
    catch (error) {
        if (isObject(error) &&
            "code" in error &&
            error.code === "23505") {
            return c.json({ message: "Email already exists" }, 409);
        }
        console.error(error);
        return c.json({ message: "Failed to register user" }, 500);
    }
});
userRoutes.post("/login", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isObject(body)) {
        return c.json({ message: "Invalid request body" }, 400);
    }
    const { email, password } = body;
    if (typeof email !== "string" || typeof password !== "string") {
        return c.json({ message: "Email and password are required" }, 400);
    }
    const user = await findUserByEmail(email.trim());
    if (!user || !(await verifyUserPassword(user, password))) {
        return c.json({ message: "Invalid email or password" }, 401);
    }
    return c.json({ message: "Login successful", user: toPublicUser(user) });
});
userRoutes.get("/", async (c) => {
    const users = await listUsers();
    return c.json({ users: users.map(toPublicUser) });
});
userRoutes.get("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
        return c.json({ message: "Invalid user id" }, 400);
    }
    const user = await findUserById(id);
    if (!user) {
        return c.json({ message: "User not found" }, 404);
    }
    return c.json({ user: toPublicUser(user) });
});
