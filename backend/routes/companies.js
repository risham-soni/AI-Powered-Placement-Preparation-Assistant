const express = require("express");
const pool = require("../db");
const authenticateToken = require("../authMiddleware");

const router = express.Router();

// Get all companies
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at
       FROM companies
       ORDER BY name ASC`
    );

    res.json({
      companies: result.rows,
    });
  } catch (error) {
    console.error(
      "Failed to load companies:",
      error
    );

    res.status(500).json({
      message: "Failed to load companies",
    });
  }
});

// Add a new company
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Company name is required",
      });
    }

    const companyName = name.trim();

    const result = await pool.query(
      `INSERT INTO companies (name)
       VALUES ($1)
       RETURNING id, name, created_at`,
      [companyName]
    );

    res.status(201).json({
      message: "Company added successfully",
      company: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Company already exists",
      });
    }

    console.error(
      "Failed to add company:",
      error
    );

    res.status(500).json({
      message: "Failed to add company",
    });
  }
});

module.exports = router;