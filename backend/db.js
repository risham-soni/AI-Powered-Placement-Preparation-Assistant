// const { Pool } = require("pg");

// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "placement_assistant",
//   password: "Risham123",
//   port: 5432,
// });

// pool.on("connect", () => {
//   console.log("Connected to PostgreSQL");
// });

// pool.on("error", (error) => {
//   console.error("Unexpected PostgreSQL error:", error);
// });

// module.exports = pool;


// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool(
//   process.env.DATABASE_URL
//     ? {
//         connectionString: process.env.DATABASE_URL,
//         ssl: {
//           rejectUnauthorized: false, // Required for Supabase SSL
//         },
//       }
//     : {
//         user: process.env.DB_USER || "postgres",
//         host: process.env.DB_HOST || "localhost",
//         database: process.env.DB_NAME || "placement_assistant",
//         password: process.env.DB_PASSWORD || "Risham123",
//         port: process.env.DB_PORT || 5432,
//       }
// );

// pool.on("connect", () => {
//   console.log("Connected to PostgreSQL (Supabase)");
// });

// pool.on("error", (error) => {
//   console.error("Unexpected PostgreSQL error:", error);
// });

// module.exports = pool;



const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase cloud SSL
  },
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL (Supabase)");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;