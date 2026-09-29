const express = require("express");

const pool = require("../db");
const authenticateToken = require("../authMiddleware");

const router = express.Router();


// GET CURRENT USER PROFILE
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile error:", error);

    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
});


module.exports = router;