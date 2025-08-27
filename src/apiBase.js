// src/apiBase.js
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://your-backend-url.onrender.com" // 👈 replace with your deployed backend URL
    : "http://localhost:5000";

export { API_BASE };

