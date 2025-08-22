import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Optional CORS setup
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

app.listen(3000, () => console.log("Server running on port 3000"));
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Health check route (optional)
app.get("/", (req, res) => {
  res.send("OpenAI Proxy is running!");
});

// 👇 Your new /start-offer route
app.post("/start-offer", async (req, res) => {
  console.log("Received data:", req.body);  // Optional debug
  try {
    // Your assistant logic here

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Assistant error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
