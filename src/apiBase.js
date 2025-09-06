// src/apiBase.js
let API_BASE = "";

// In local development use the backend port
if (process.env.NODE_ENV === "development") {
  API_BASE = "http://localhost:5000";
}

export { API_BASE };
