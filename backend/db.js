const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // Also fallback to root .env if present

const cleanConnectionString = (process.env.DATABASE_URL || "")
  .trim()
  .replace(/^["']|["']$/g, "");

const isLocalDb =
  cleanConnectionString.includes("localhost") ||
  cleanConnectionString.includes("127.0.0.1") ||
  process.env.DB_SSL === "false";

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isLocalDb
    ? false
    : {
        rejectUnauthorized: false,
      },
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL Database (Supabase)");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;