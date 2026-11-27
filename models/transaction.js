import pool from "../config/database.js";

export default async function withTransaction(operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Could not roll back PostgreSQL transaction:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
