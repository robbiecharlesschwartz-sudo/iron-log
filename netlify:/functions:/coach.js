// netlify/functions/coach.js
//
// Plain Node.js Netlify Function (no build step / no TypeScript compile needed).
// Netlify auto-detects files in netlify/functions/ and deploys each as an
// endpoint at /.netlify/functions/<filename>.
//
// Requires an environment variable set in Netlify's site settings:
//   ANTHROPIC_API_KEY = sk-ant-...
//
// Request body (POST, JSON):
//   {
//     "sessions": [
//       { "date": "2026-07-28", "exercises": [
//           { "name": "Bench Press", "sets": [{ "weight": 185, "reps": 8 }, ...] },
//           ...
//         ]
//       },
//       ... up to ~10 recent sessions
//     ],
//     "profileName": "Robbie"
//   }
//
// Response (JSON):
//   { "text": "...coaching insight paragraph..." }
//   or { "error": "..." } on failure

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  const profileName = typeof body.profileName === "string" ? body.profileName : null;

  if (!sessions.length) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: "Log a few more sessions and I'll have real trends to work with.",
      }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "Coach isn't configured yet. Set ANTHROPIC_API_KEY in Netlify site environment variables.",
      }),
    };
  }

  // Compact the session data into readable plain text so we don't burn tokens
  // on JSON punctuation, and so the model reasons over training language
  // rather than parsing structure.
  const sessionText = sessions
    .map((s) => {
      const date = s.date || "unknown date";
      const exLines = (s.exercises || [])
        .map((ex) => {
          const setStr = (ex.sets || [])
            .map((st) => `${st.weight ?? "?"}x${st.reps ?? "?"}`)
            .join(", ");
          return `  - ${ex.name || "exercise"}: ${setStr || "no sets logged"}`;
        })
        .join("\n");
      return `${date}\n${exLines}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a knowledgeable, encouraging strength-training coach reviewing a lifter's recent logged workouts. Give ONE short, specific, actionable observation (3-5 sentences max). Look for things like: progressive overload opportunities, muscle groups being under-trained relative to others, plateaus, or good consistency worth acknowledging. Be concrete with numbers from their actual data when possible. Do not use markdown formatting, headers, or bullet points — write in plain conversational prose. Do not introduce yourself or use a greeting; just give the insight directly.`;

  const userPrompt = `${profileName ? `Lifter: ${profileName}\n\n` : ""}Recent training log (most recent last):\n\n${sessionText}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Coach service is temporarily unavailable." }),
      };
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const text = textBlock ? textBlock.text.trim() : "No insight generated.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("Coach function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Something went wrong reaching the coach." }),
    };
  }
};
