import { readFile } from "node:fs/promises";
import pool from "../config/database.js";

const migrationUrl = new URL("../migrations/001_social_graph.sql", import.meta.url);

export async function initializeSocialTables() {
  const migration = await readFile(migrationUrl, "utf8");
  await pool.query(migration);
}
