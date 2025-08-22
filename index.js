import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Main assistant workflow route
app.post("/start-offer", async (req, res) => {
  const { message, bot_type } = req.body;

  try {
    // 1. Validate inputs
    if (!bot_type || !message) {
      return res.status(400).json({ error: "Missing 'bot_type' or 'message' in request body." });
    }

    const ASSISTANT_ID = process.env[bot_type];
    if (!ASSISTANT_ID) {
      return res.status(400).json({ error: `Invalid bot_type '${bot_type}' - no matching ASSISTANT_ID found.` });
    }

    // 2. Create a thread
    const threadResp = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const threadData = await threadResp.json();
    const thread_id = threadData.id;

    // 3. Add user message to the thread
    await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
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

    // 4. Run the assistant
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

    const runData = await runResp.json();
    const run_id = runData.id;

    // 5. Poll until run completes
    let runStatus = "in_progress";
    while (runStatus === "in_progress" || runStatus === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // wait 1.5s

      const statusResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      });

      const statusData = await statusResp.json();
      runStatus = statusData.status;
    }

    // 6. Get the assistant's final response
    const messagesResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const messagesData = await messagesResp.json();
    const lastMessage = messagesData.data.find((msg) => msg.role === "assistant");

    return res.status(200).json({
      response: lastMessage?.content?.[0]?.text?.value || "No assistant response.",
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Health check
app.get("/", (req, res) => res.send("OpenAI Assistant Proxy is running"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
