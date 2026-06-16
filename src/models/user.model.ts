import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

export type UserRole = "user" | "admin";

export const USER_ROLES = ["user", "admin"] as const;

export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Omit<User, "passwordHash">;

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};

const SALT_ROUNDS = 10;

const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toPublicUser = ({ passwordHash: _passwordHash, ...user }: User): PublicUser =>
  user;

export const initUserTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const createUser = async ({
  name,
  email,
  password,
  role = "user",
}: CreateUserInput): Promise<User> => {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, password_hash, role, created_at, updated_at
    `,
    [name, email.toLowerCase(), passwordHash, role],
  );

  return mapUserRow(result.rows[0]);
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query<UserRow>(
    `
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
    [email.toLowerCase()],
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

export const findUserById = async (id: number): Promise<User | null> => {
  const result = await pool.query<UserRow>(
    `
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};

export const listUsers = async (): Promise<User[]> => {
  const result = await pool.query<UserRow>(`
    SELECT id, name, email, password_hash, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `);

  return result.rows.map(mapUserRow);
};

export const verifyUserPassword = async (
  user: User,
  password: string,
): Promise<boolean> => bcrypt.compare(password, user.passwordHash);
