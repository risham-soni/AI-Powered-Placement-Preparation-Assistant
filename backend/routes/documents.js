const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = require("../db");
const authenticateToken = require("../authMiddleware");

const router = express.Router();


const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/");

  },

  filename: function (req, file, cb) {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);

  },

});


const upload = multer({

  storage: storage,

  fileFilter: function (req, file, cb) {

    if (file.mimetype === "application/pdf") {

      cb(null, true);

    } else {

      cb(
        new Error("Only PDF files are allowed.")
      );

    }

  },

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

});

router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          company,
          file_name,
          file_path,
          created_at
        FROM user_documents
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.userId]
      );

      const documents = result.rows.map(
        (document) => ({
          id: document.id,

          company: document.company,

          file_name: document.file_name,

          document_name:
            path.basename(
              document.file_path
            ),

          created_at:
            document.created_at
        })
      );

      res.json({
        documents
      });

    } catch (error) {

      console.error(
        "Failed to load documents:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load uploaded documents"
      });

    }
  }
);


// UPLOAD PDF
router.post(
  "/upload",
  authenticateToken,
  upload.single("pdf"),

  async (req, res) => {

    try {

      const { company } = req.body;


      if (!req.file) {

        return res.status(400).json({
          message: "PDF file is required",
        });

      }


      if (!company) {

        return res.status(400).json({
          message: "Company is required",
        });

      }


      // Save document information in PostgreSQL
      const result = await pool.query(

        `INSERT INTO user_documents
         (user_id, company, file_name, file_path)
         VALUES ($1, $2, $3, $4)
         RETURNING id, company, file_name, created_at`,

        [
          req.user.userId,
          company,
          req.file.originalname,
          req.file.path,
        ]

      );


      // Send document information and file content to RAG service
      try {
        const RAG_SERVICE_URL =
          process.env.RAG_SERVICE_URL || "http://127.0.0.1:8000";

        // Read file as base64 so RAG service receives the actual file contents
        // even when running in separate containers or isolated cloud environments (like Render).
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileBase64 = fileBuffer.toString("base64");

        const ragResponse = await fetch(
          `${RAG_SERVICE_URL}/documents/process`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              file_path: path.resolve(
                req.file.path
              ),
              file_name: req.file.filename,
              file_base64: fileBase64,
              company: company,
              user_id: req.user.userId,
            }),
          }
        );

        const ragData =
          await ragResponse.json();

        if (!ragResponse.ok) {
          console.error(
            "RAG processing error:",
            ragData
          );

          // Rollback inserted document in database so broken entries are not kept
          await pool.query(
            "DELETE FROM user_documents WHERE id = $1",
            [result.rows[0].id]
          );

          return res.status(500).json({
            message:
              ragData.detail ||
              "PDF was uploaded, but RAG processing failed.",
            document: result.rows[0],
          });
        }

        return res.status(201).json({
          message:
            "PDF uploaded and indexed successfully.",
          document: result.rows[0],
          rag: ragData,
        });

      } catch (ragError) {
        console.error(
          "RAG service connection error:",
          ragError
        );

        // Rollback inserted document in database
        await pool.query(
          "DELETE FROM user_documents WHERE id = $1",
          [result.rows[0].id]
        );

        return res.status(500).json({
          message:
            "PDF was uploaded, but the RAG service could not be reached: " +
            ragError.message,
          document: result.rows[0],
        });
      }

    } catch (error) {
      console.error(
        "Document upload error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to upload PDF",
      });
    }
  }
);


// DELETE DOCUMENT
router.delete(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const documentId = req.params.id;

      const result = await pool.query(
        `DELETE FROM user_documents
         WHERE id = $1 AND user_id = $2
         RETURNING file_path`,
        [documentId, req.user.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      const filePath = result.rows[0].file_path;
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn("Could not delete local file:", unlinkErr);
        }
      }

      res.json({
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        message: "Failed to delete document",
      });
    }
  }
);


module.exports = router;