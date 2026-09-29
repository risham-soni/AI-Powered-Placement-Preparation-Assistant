const express = require("express");

const pool = require("../db");
const authenticateToken = require("../authMiddleware");

const router = express.Router();


// SAVE CHAT HISTORY
router.post("/history", authenticateToken, async (req, res) => {
  try {
    const { question, answer, company } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        message: "Question and answer are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO chat_history
       (user_id, question, answer, company)
       VALUES ($1, $2, $3, $4)
       RETURNING id, question, answer, company, created_at`,
      [
        req.user.userId,
        question,
        answer,
        company || null,
      ]
    );

    res.status(201).json({
      message: "Chat history saved",
      chat: result.rows[0],
    });
  } catch (error) {
    console.error("Save chat history error:", error);

    res.status(500).json({
      message: "Failed to save chat history",
    });
  }
});

// GET CHAT HISTORY
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, question, answer, company, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({
      chats: result.rows,
    });
  } catch (error) {
    console.error("Get chat history error:", error);

    res.status(500).json({
      message: "Failed to fetch chat history",
    });
  }
});


module.exports = router;