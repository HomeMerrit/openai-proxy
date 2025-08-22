import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const checkResponse = async (res) => {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${res.statusText} — ${errorText}`);
  }
  return res.json();
};

app.post("/start-offer", async (req, res) => {
  const { message, bot_type } = req.body;

  try {
    if (!bot_type || !message) {
      return res.status(400).json({ error: "Missing 'bot_type' or 'message' in request body." });
    }

    const ASSISTANT_ID = process.env[bot_type];
    if (!ASSISTANT_ID) {
      return res.status(400).json({ error: `Invalid bot_type '${bot_type}' - no matching ASSISTANT_ID found.` });
    }

    // 1. Create a thread
    const threadResp = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    const threadData = await checkResponse(threadResp);
    const thread_id = threadData.id;

    // 2. Add user message to the thread
    const messageResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        role: "user",
        content: message,
      }),
    });
    await checkResponse(messageResp);

    // 3. Run the assistant
    const runResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
      }),
    });
    const runData = await checkResponse(runResp);
    const run_id = runData.id;

    // 4. Poll until run completes
    let runStatus = "in_progress";
    while (runStatus === "in_progress" || runStatus === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const statusResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      });
      const statusData = await checkResponse(statusResp);
      runStatus = statusData.status;
    }

    // 5. Get final response
    const messagesResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    const messagesData = await checkResponse(messagesResp);
    const lastMessage = messagesData.data.find((msg) => msg.role === "assistant");

    return res.status(200).json({
      response: lastMessage?.content?.[0]?.text?.value || "No assistant response.",
    });
  } catch (err) {
    console.error("🔥 Error caught in handler:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

app.get("/", (req, res) => res.send("OpenAI Assistant Proxy is running"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
