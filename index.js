import app from "./network.js";
import pool from "./config/database.js";
import { initializeBotTable } from "./models/Bot.js";
import { initializePostTable } from "./models/Post.js";
import { initializeSocialTables } from "./models/Social.js";
import { initializeUserTable } from "./models/User.js";

const PORT = process.env.PORT || 3000;

try {
  await initializeUserTable();
  await initializePostTable();
  await initializeBotTable();
  await initializeSocialTables();
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error("Could not start the server:", error);
  await pool.end();
  process.exitCode = 1;
}