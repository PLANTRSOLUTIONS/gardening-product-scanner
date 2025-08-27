// /api/scan.js — Vercel Serverless Function (Node runtime)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ingredients } = req.body || {};
    if (!ingredients || typeof ingredients !== "string") {
      return res.status(400).json({ error: "Missing 'ingredients' (string) in body" });
    }

    // Build the same prompt your frontend expects
    const prompt = `
You are a product safety evaluator for gardening products. Based on the ingredients provided, please:
1) Provide a score from 0 (toxic/banned/harmful) to 100 (safe, organic, eco-friendly).
2) Provide a short summary (<= 50 words) explaining why the product is good or bad.
3) Briefly mention which key ingredients are good or bad without detailed per-ingredient explanations.
Format:
Score: <number>
Summary: <<=50 words>
Notes: <one or two short bullets>

Ingredients: ${ingredients}
    `.trim();

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful gardening product scanner." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 250,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(500).json({ error: `Upstream error: ${r.status} ${errText}` });
    }

    const data = await r.json();
    const result = data?.choices?.[0]?.message?.content?.trim();
    if (!result) return res.status(500).json({ error: "Empty AI response" });

    // Keep the same shape your React code expects
    return res.json({ result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
