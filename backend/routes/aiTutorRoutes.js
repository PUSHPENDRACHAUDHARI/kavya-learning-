const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const axios = require("axios");

// Initialize OpenAI with your API key from .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai/chat
// Body: { message, model }
// model: optional string. If 'claude-haiku-4.5' and CLAUDE_HAIKU_ENABLED=true and CLAUDE_API_KEY set,
// the server will proxy the request to the configured Claude/Anthropic endpoint.
router.post("/chat", async (req, res) => {
  const { message, model } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: true, message: "Message is required" });
  }

  // If client requests Claude model and it's enabled on server, proxy to Anthropic
  if (model && model.toLowerCase().startsWith("claude")) {
    const enabled = String(process.env.CLAUDE_HAIKU_ENABLED || "false").toLowerCase() === "true";
    const apiKey = process.env.CLAUDE_API_KEY;
    const apiUrl = process.env.CLAUDE_API_URL || "https://api.anthropic.com/v1/complete";

    if (!enabled) {
      return res.status(403).json({ error: true, message: "Requested model is not enabled on server" });
    }

    if (!apiKey) {
      console.warn("CLAUDE_API_KEY not configured — returning fallback reply for UI testing");
      const fallback = `Demo reply (Claude key not configured). You asked: "${message}"`;
      return res.json({ reply: fallback });
    }

    try {
      // Prepare a safe prompt. Anthropic APIs accept different shapes depending on version/provider.
      // We send { model, prompt, max_tokens, temperature } as a generic payload; user can configure via env.
      const payload = {
        model: model || "claude-haiku-4.5",
        prompt: message,
        max_tokens: req.body.max_tokens || 300,
        temperature: typeof req.body.temperature !== 'undefined' ? req.body.temperature : 0.2
      };

      const response = await axios.post(apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      // Try common locations for a text reply
      let replyText = null;
      if (response?.data) {
        replyText = response.data?.completion || response.data?.output || response.data?.response || null;
        if (!replyText && Array.isArray(response.data?.completions) && response.data.completions.length > 0) {
          replyText = response.data.completions[0]?.data?.text || response.data.completions[0]?.text;
        }
      }

      if (!replyText) replyText = "(no reply from Claude)";
      return res.json({ reply: replyText, _raw: response.data ? undefined : null });
    } catch (error) {
      console.error("Error proxying to Claude endpoint:", error?.response?.data || error.message || error);
      const errMessage = error?.response?.data || error?.message || "Claude proxy error";
      const fallback = `Sorry — the Claude AI service is temporarily unavailable. Demo reply: you asked "${message}".`;
      return res.json({ reply: fallback, _debug: { error: errMessage } });
    }
  }

  // Default: use OpenAI (existing behavior)
  // If API key is not set, return a lightweight fallback reply so the UI remains functional
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "OpenAI API key is not set (OPENAI_API_KEY) — returning fallback reply for UI testing"
    );
    const fallback = `Demo reply (OpenAI key not configured). You asked: "${message}"`;
    return res.json({ reply: fallback });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    let replyText = null;
    if (response?.choices && response.choices.length > 0) {
      replyText = response.choices[0]?.message?.content || response.choices[0]?.text;
    }

    if (!replyText && response?.data) {
      replyText = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text;
    }

    if (!replyText) replyText = "(no reply from AI)";

    return res.json({ reply: replyText });
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    const errMessage =
      error?.response?.data?.error?.message || error?.message || (error?.response && JSON.stringify(error.response.data)) || "Internal server error";
    const fallback = `Sorry — the AI service is temporarily unavailable. Demo reply: you asked "${message}".`;
    console.warn("/api/ai/chat fallback reply returned. Error:", errMessage);
    return res.json({ reply: fallback, _debug: { error: errMessage } });
  }
});

// POST /api/verify-upi
router.post('/verify-upi', async (req, res) => {
  const { upi, gateway } = req.body || {};

  if (!upi) return res.status(400).json({ error: true, message: 'UPI ID is required' });

  // Basic format validation
  const parts = upi.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return res.status(400).json({ error: true, message: 'Invalid UPI ID format' });
  }

  // Simulate async verification delay
  await new Promise((r) => setTimeout(r, 600));

  // Simulate success and return an inferred display name
  const name = parts[0];
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  return res.json({ verified: true, name: displayName, gateway: gateway || null });
});

// POST /api/process-payment - mock payment processing endpoint
router.post('/process-payment', async (req, res) => {
  const { method, amount, details } = req.body || {};
  if (!method || !amount) return res.status(400).json({ error: true, message: 'method and amount required' });

  // simulate processing delay
  await new Promise(r => setTimeout(r, 800));

  // simulate success with transaction id
  const txId = `TXN-${Date.now().toString().slice(-6)}`;
  return res.json({ success: true, txId, method, amount, details });
});

module.exports = router;
