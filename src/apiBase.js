// src/apiBase.js
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://gardening-product-scanner.onrender.com/" // 👈 your actual backend Render URL
    : "http://localhost:5000";

export { API_BASE };

