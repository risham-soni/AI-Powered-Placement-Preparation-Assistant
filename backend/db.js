const { Pool } = require("pg");
require("dotenv").config();

let poolConfig;

if (process.env.DB_HOST) {
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST.trim(),
    port: Number(process.env.DB_PORT) || 6543,
    database: process.env.DB_NAME || "postgres",
    ssl: {
      rejectUnauthorized: false,
    },
  };
  console.log(`Connecting to DB via discrete host: ${process.env.DB_HOST}`);
} else if (process.env.DATABASE_URL) {
  // Strip accidental surrounding quotes and whitespace
  const cleanUrl = process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "");
  poolConfig = {
    connectionString: cleanUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  };
  const masked = cleanUrl.replace(/:([^:@]+)@/, (match, p1) => `:${"*".repeat(Math.min(p1.length, 6))}@`);
  console.log(`Connecting to DB via connectionString: ${masked}`);
} else {
  console.error("No database configuration found (neither DB_HOST nor DATABASE_URL is set)!");
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL Database");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;