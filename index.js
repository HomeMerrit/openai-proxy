import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function checkResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} ${text}`);
  }
  return response.json();
}

function getAssistantId(botType) {
  const key = `${botType}_BOT`.toUpperCase();
  const assistantId = process.env[key];
  if (!assistantId) {
    throw new Error(`No assistant found for bot type: ${botType}`);
  }
  return assistantId;
}

app.post("/start-offer", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const botType = req.body.bot_type || "DEFAULT";

    if (!userMessage) {
      return res.status(400).json({ error: "Missing `message` in request body." });
    }

    const assistant_id = getAssistantId(botType);

    // 1. Create Thread
    const threadResp = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      }
    });
    const threadData = await checkResponse(threadResp);
    const thread_id = threadData.id;

    // 2. Add Message to Thread
    const messageResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: userMessage,
      }),
    });
    await checkResponse(messageResp);

    // 3. Run the Assistant
    const runResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id,
        instructions: `You are running in ${botType} mode.`,
      }),
    });
    const runData = await checkResponse(runResp);
    const run_id = runData.id;

    // 4. Poll until status is 'completed'
    let runStatus = runData.status;
    while (runStatus !== "completed" && runStatus !== "failed" && runStatus !== "cancelled") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResp = await fetch(
        `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2"
          },
        }
      );
      const statusData = await checkResponse(statusResp);
      runStatus = statusData.status;
    }

    if (runStatus !== "completed") {
      return res.status(500).json({ error: `Run failed with status: ${runStatus}` });
    }

    // 5. Get the latest assistant message
    const messagesResp = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2"
      },
    });
    const messagesData = await checkResponse(messagesResp);

    const lastMessage =
      Array.isArray(messagesData?.data) && messagesData.data.length > 0
        ? messagesData.data.find((msg) => msg.role === "assistant")
        : null;

    return res.status(200).json({
      response: lastMessage?.content?.[0]?.text?.value || "No assistant response.",
    });
  } catch (err) {
    console.error("🔥 Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
