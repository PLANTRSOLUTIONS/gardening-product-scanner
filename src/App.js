// src/App.js - Gardening Product Scanner frontend (recommendation + affiliate link)

import React, { useState } from "react";
import { API_BASE } from "./apiBase"; // 👈 added import

function App() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [newProduct, setNewProduct] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = async (value) => {
    setPrompt(value);
    if (value.trim() === "") {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/suggestions?q=${encodeURIComponent(value)}`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error("❌ Suggestion fetch failed:", err);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    setSuggestions([]);
  };

  const handleScan = async () => {
    if (!prompt.trim()) {
      setError("Please enter a product or description.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data); // expecting JSON
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.trim()) {
      setMessage("Enter a valid product name.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/add-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: newProduct }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Added: ${data.product}`);
        setNewProduct("");
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Failed to add product.");
    }
  };

  // color-coded score styling
  const getScoreColor = (score, max = 100) => {
    const percent = (score / max) * 100;
    if (percent >= 75) return { background: "#4CAF50", color: "#fff" }; // green
    if (percent >= 50) return { background: "#FF9800", color: "#fff" }; // orange
    return { background: "#F44336", color: "#fff" }; // red
  };

  // quick icon based on score
  const getScoreIcon = (score, max = 100) => {
    const percent = (score / max) * 100;
    if (percent >= 75) return "✅";
    if (percent >= 50) return "⚠️";
    return "❌";
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🌱 Gardening Product Scanner</h1>

      <textarea
        style={styles.textarea}
        rows="4"
        placeholder="Enter product ingredients or description..."
        value={prompt}
        onChange={(e) => handleChange(e.target.value)}
      />

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul style={styles.suggestionBox}>
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              style={styles.suggestionItem}
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      <button style={styles.button} onClick={handleScan} disabled={loading}>
        {loading ? "Scanning..." : "🔍 Scan Product"}
      </button>

      {error && <p style={styles.error}>{error}</p>}

      {/* Sprouting animation */}
      {loading && (
        <div
          style={{
            marginTop: "20px",
            fontSize: "40px",
            animation: "bounce 1s infinite",
          }}
        >
          🌱
          <p style={{ fontSize: "16px", marginTop: "8px", color: "#555" }}>
            Analyzing product...
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && result && !result.error && (
        <div style={styles.resultContainer}>
          {/* Overall Score */}
          {result.overall && (
            <div
              style={{
                ...styles.scoreBox,
                ...getScoreColor(result.overall.score, 100),
              }}
            >
              ⭐ {getScoreIcon(result.overall.score, 100)} Overall Score:{" "}
              {result.overall.score}/100
            </div>
          )}

          {/* Product details */}
          <div style={styles.card}>
            <h2 style={styles.productName}>🛒 {result.product}</h2>

            {/* Safety */}
            <div
              style={{
                ...styles.detailBox,
                ...getScoreColor(result.safety.score, 5),
              }}
            >
              <strong>
                🌿 {getScoreIcon(result.safety.score, 5)} Safety (
                {result.safety.score}/5):
              </strong>{" "}
              {result.safety.details}
            </div>

            {/* Effectiveness */}
            <div
              style={{
                ...styles.detailBox,
                ...getScoreColor(result.effectiveness.score, 5),
              }}
            >
              <strong>
                🌸 {getScoreIcon(result.effectiveness.score, 5)} Effectiveness (
                {result.effectiveness.score}/5):
              </strong>{" "}
              {result.effectiveness.details}
            </div>

            {/* Summary */}
            <p style={{ marginTop: "10px" }}>
              <strong>📋 Summary:</strong> {result.overall.summary}
            </p>
          </div>

          {/* Recommendation + Affiliate link */}
          {result.recommendation && (
            <div style={styles.recommendBox}>
              <h3>🌟 Recommended Alternative</h3>
              <p style={{ margin: "6px 0" }}>
                <strong>{result.recommendation.alternative}</strong> —{" "}
                {result.recommendation.reason}
              </p>

              <a
                href={result.recommendation.affiliateLink}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.affiliateButton}
              >
                🛒 Buy on Amazon
              </a>

              <p style={styles.disclosure}>
                <small>
                  Affiliate disclosure: I may earn from qualifying purchases.
                </small>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add product */}
      <div style={styles.addBox}>
        <h3>➕ Add a New Product</h3>
        <input
          type="text"
          style={styles.input}
          value={newProduct}
          onChange={(e) => setNewProduct(e.target.value)}
          placeholder="Enter product name..."
        />
        <button style={styles.buttonSmall} onClick={handleAddProduct}>
          ➕ Add
        </button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "20px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    marginBottom: "20px",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    marginBottom: "5px",
    fontSize: "16px",
  },
  suggestionBox: {
    listStyle: "none",
    margin: "0",
    padding: "0",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "5px",
    textAlign: "left",
    maxHeight: "150px",
    overflowY: "auto",
    marginBottom: "15px",
  },
  suggestionItem: {
    padding: "10px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginTop: "10px",
  },
  error: {
    color: "red",
    marginTop: "15px",
  },
  resultContainer: {
    marginTop: "20px",
    textAlign: "left",
  },
  scoreBox: {
    padding: "15px",
    borderRadius: "8px",
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "15px",
  },
  card: {
    padding: "15px",
    background: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  productName: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "10px",
  },
  detailBox: {
    padding: "10px",
    borderRadius: "6px",
    marginTop: "8px",
  },
  recommendBox: {
    marginTop: "16px",
    padding: "14px",
    background: "#fff9e6",
    borderRadius: "8px",
    border: "1px solid #ffe08a",
  },
  affiliateButton: {
    display: "inline-block",
    marginTop: "8px",
    padding: "10px 14px",
    background: "#232F3E", // Amazon-ish button color
    color: "#fff",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
  },
  disclosure: {
    marginTop: "6px",
    color: "#666",
  },
  addBox: {
    marginTop: "30px",
    padding: "15px",
    background: "#e9f5e9",
    borderRadius: "5px",
  },
  input: {
    width: "70%",
    padding: "8px",
    marginRight: "10px",
    fontSize: "14px",
  },
  buttonSmall: {
    padding: "8px 12px",
    fontSize: "14px",
    background: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default App;
