const { Pool } = require("pg");
require("dotenv").config();

let poolConfig;

if (process.env.DB_HOST) {
  // Discrete parameters: immune to special characters in password!
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 6543,
    database: process.env.DB_NAME || "postgres",
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else {
  // Connection string URI
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL Database");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;