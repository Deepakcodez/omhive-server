import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
export const USER_ROLES = ["user", "admin"];
const SALT_ROUNDS = 10;
const mapUserRow = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const toPublicUser = ({ passwordHash: _passwordHash, ...user }) => user;
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
export const createUser = async ({ name, email, password, role = "user", }) => {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, password_hash, role, created_at, updated_at
    `, [name, email.toLowerCase(), passwordHash, role]);
    return mapUserRow(result.rows[0]);
};
export const findUserByEmail = async (email) => {
    const result = await pool.query(`
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `, [email.toLowerCase()]);
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};
export const findUserById = async (id) => {
    const result = await pool.query(`
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `, [id]);
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
};
export const listUsers = async () => {
    const result = await pool.query(`
    SELECT id, name, email, password_hash, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `);
    return result.rows.map(mapUserRow);
};
export const verifyUserPassword = async (user, password) => bcrypt.compare(password, user.passwordHash);
