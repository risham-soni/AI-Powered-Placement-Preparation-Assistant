const { Pool } = require("pg");
require("dotenv").config();

const cleanConnectionString = (process.env.DATABASE_URL || "")
  .trim()
  .replace(/^["']|["']$/g, "");

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: {
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