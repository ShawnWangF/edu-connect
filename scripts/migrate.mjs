import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const connection = await mysql.createConnection(databaseUrl);
const db = drizzle(connection);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied successfully");
} finally {
  await connection.end();
}
