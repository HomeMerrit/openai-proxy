import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Middleware
app.use(bodyParser.json());

// Optional: CORS setup
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Health check route
app.get("/", (req, res) => {
  res.send("✅ OpenAI Proxy is running!");
});

// MAIN: Proxy to OpenAI
app.post("/start-offer", async (req, res) => {
  const { model, messages, temperature = 0.7 } = req.body;

  if (!model || !messages) {
    return res.status(400).json({
      error: "Missing required fields: model and messages are required.",
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("OpenAI Proxy Error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
