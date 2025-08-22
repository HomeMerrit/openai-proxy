import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Optional CORS setup
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// OpenAI Proxy Route for generic completions
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("OpenAI Proxy is running!");
});

// ✅ Actual /start-offer route for Zapier POST
app.post("/start-offer", async (req, res) => {
  const { model, temperature, messages } = req.body;

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages,
      }),
    });

    const data = await openaiResponse.json();
    return res.status(200).json(data); // 👈 return GPT response to Zapier
  } catch (error) {
    console.error("OpenAI error:", error);
    return res.status(500).json({ error: "OpenAI request failed." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
