// Uses Render URLs in production (from Vercel environment variables),
// or falls back to localhost when running locally.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export const RAG_BASE_URL =
  import.meta.env.VITE_RAG_URL || "http://127.0.0.1:8000";