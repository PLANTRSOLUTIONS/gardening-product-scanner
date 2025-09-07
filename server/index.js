// ✅ Load environment variables (local dev only)
const path = require("path");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: path.join(__dirname, ".env"), // local only
  });
}

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();

// ✅ CORS only in development
if (process.env.NODE_ENV !== "production") {
  const allowedOrigins = [
    process.env.FRONTEND_URL, // optional: set on Render if you want
    "http://localhost:3000",
  ].filter(Boolean);
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

app.use(express.json());

// ✅ Check API key early
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found. Did you create a .env file?");
  process.exit(1); // Stop the server if no key is loaded
} else {
  console.log(
    "✅ OpenAI API key loaded:",
    process.env.OPENAI_API_KEY.slice(0, 12) + "..."
  );
}

// 👉 Add your Amazon Associates tag in .env, e.g. AMAZON_ASSOC_TAG=yourtag-20
const AMAZON_ASSOC_TAG = process.env.AMAZON_ASSOC_TAG || "";

// Path to store product list
const PRODUCTS_FILE = path.join(__dirname, "products.json");

// Load products from file, or fallback to default list
let productList = [];
try {
  if (fs.existsSync(PRODUCTS_FILE)) {
    productList = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
  } else {
    productList = [
      "Miracle-Gro All Purpose Plant Food",
      "Scotts Turf Builder Weed & Feed",
      "Roundup Weed Killer",
      "Espoma Organic Plant Tone",
      "Neem Oil Insecticide",
      "Bonide Copper Fungicide",
      "Jobe’s Organics Fertilizer Spikes",
      "Sevin Garden Dust",
      "Compost",
      "Peat Moss",
      "Organic Potting Mix",
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productList, null, 2));
  }
} catch (err) {
  console.error("❌ Error loading products:", err);
  productList = [];
}

// Save function
const saveProducts = () => {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productList, null, 2));
};

// -----------------------
// ✅ API Routes (keep before static serving)
// -----------------------

// Health check
app.get("/api/health", (req, res) => {
  res.send("🌱 Gardening Product Scanner API is running!");
});

// Small probe to verify API reachability in prod
app.get("/api/__probe", (req, res) => {
  res.json({ ok: true, when: new Date().toISOString() });
});

// Get suggestions
app.get("/api/suggestions", (req, res) => {
  const query = req.query.q?.toLowerCase() || "";
  if (!query) return res.json([]);

  const matches = productList.filter((item) =>
    item.toLowerCase().includes(query)
  );

  res.json(matches.slice(0, 5));
});

// Add new product
app.post("/api/add-product", (req, res) => {
  const { product } = req.body;

  if (!product || typeof product !== "string") {
    return res.status(400).json({ error: "Invalid product name." });
  }

  if (productList.some((p) => p.toLowerCase() === product.toLowerCase())) {
    return res.status(400).json({ error: "Product already exists." });
  }

  productList.push(product);
  saveProducts();

  res.json({ success: true, message: "Product added.", product });
});

// Helpers
const capWords = (text, max) => {
  if (!text) return text;
  const parts = String(text).trim().split(/\s+/);
  if (parts.length <= max) return text;
  return parts.slice(0, max).join(" ");
};

const buildAmazonSearchLink = (q, tag = "") => {
  const base = "https://www.amazon.com/s";
  const query = encodeURIComponent(q || "");
  const tagPart = tag ? `&tag=${encodeURIComponent(tag)}` : "";
  return `${base}?k=${query}${tagPart}`;
};

// Scan product
app.post("/api/scan", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "A valid prompt is required." });
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that rates gardening products.
Always respond ONLY in strict JSON with the following format:

{
  "product": "Product name",
  "safety": { "score": 1-5, "details": "explanation" },
  "effectiveness": { "score": 1-5, "details": "explanation" },
  "overall": { "score": 1-100, "summary": "summary of 20–50 words" },
  "recommendation": {
    "alternative": "Specific product or ingredient-based alternative",
    "reason": "≤25 words, why this is a safer/effective alternative",
    "keywords": "comma-separated shopping keywords"
  }
}

Rules:
- "overall.summary" MUST be between 20 and 50 words (aim ~35) and easy to read.
- Be concise and neutral; no hype.
- "recommendation.alternative" should be commonly available and not the same as the input product.
- "recommendation.reason" max 25 words.
- "recommendation.keywords" should be concrete (e.g., "cold-pressed neem oil, horticultural spray, OMRI").
- Do not include anything outside the JSON object.`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 450,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let raw = response.data.choices?.[0]?.message?.content || "{}";
    let result;

    try {
      result = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Failed to parse JSON from AI:", raw);
      return res.status(500).json({ error: "AI response was not valid JSON." });
    }

    if (result?.overall?.summary) {
      result.overall.summary = capWords(result.overall.summary, 50);
    }

    const keywords =
      result?.recommendation?.keywords ||
      result?.recommendation?.alternative ||
      "";

    const affiliateLink = buildAmazonSearchLink(keywords, AMAZON_ASSOC_TAG);

    result.recommendation = {
      ...(result.recommendation || {}),
      affiliateLink,
    };

    res.json(result);
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to process request",
      details: error.response?.data || error.message,
    });
  }
});

// -----------------------
// ✅ Serve React build in production (never catch /api/*)
// -----------------------
const buildPath = path.join(__dirname, "..", "build");

if (process.env.NODE_ENV === "production" && fs.existsSync(buildPath)) {
  // Extra guard so no middleware before us hijacks /api/*
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return next();
  });

  app.use(express.static(buildPath));

  // Catch-all for client-side routing, EXCLUDING /api/*
  app.get(/^\/(?!api\/).*/, (req, res) => {
    // console.log("➡️ SPA catch-all served for:", req.path); // uncomment to see in Render logs
    res.sendFile(path.join(buildPath, "index.html"));
  });

  console.log("✅ Serving React build from:", buildPath);
}

// -----------------------
// ✅ Start server
// -----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
