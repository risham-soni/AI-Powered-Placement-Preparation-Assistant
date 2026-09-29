const express = require("express");
const multer = require("multer");
const path = require("path");

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


      // Send document information to RAG service
      try {

        const ragResponse = await fetch(
          "http://127.0.0.1:8000/documents/process",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({

              file_path: path.resolve(
                req.file.path
              ),

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

          return res.status(500).json({

            message:
              "PDF was uploaded, but RAG processing failed.",

            document: result.rows[0],

          });

        }


        return res.status(201).json({

          message:
            "PDF uploaded and sent for RAG processing.",

          document: result.rows[0],

          rag: ragData,

        });


      } catch (ragError) {

        console.error(
          "RAG service connection error:",
          ragError
        );


        return res.status(500).json({

          message:
            "PDF was uploaded, but the RAG service could not be reached.",

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


module.exports = router;