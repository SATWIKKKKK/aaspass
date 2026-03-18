import "dotenv/config";

const systemPrompt = `
You are AasPass AI Assistant — a helpful assistant for AasPass, a student service discovery platform in India that helps students find hostels, PGs, gyms, mess/tiffin services, libraries, laundry, and coworking spaces.

You have TWO modes:

MODE 1 — SERVICE SEARCH (when DATABASE RESULTS are provided):
- You will receive a "DATABASE RESULTS" block containing real services from the AasPass platform.
- ONLY describe and recommend services from this block.
- NEVER invent, hallucinate, or suggest any service name, address, or detail that is not in the DATABASE RESULTS.
- If DATABASE RESULTS is empty or says "none", respond: "I couldn't find any matching services on AasPass right now. Try searching with a different location or service type."
- Format each service name in bold using **Service Name** markdown.
- Do NOT use quotation marks around service names.
- Be concise, friendly, and helpful.
- After listing services, offer to help narrow down by price, amenities, or other filters.

MODE 2 — GENERAL CHAT (when no DATABASE RESULTS are provided):
- Behave as a friendly, knowledgeable AI assistant.
- Answer any general question helpfully — study tips, college advice, general knowledge, coding, etc.
- Keep responses conversational and appropriately concise.
- Always stay helpful and positive.
- If asked about services NOT available in AasPass context, remind the user you can help find student services on AasPass if they share their location.

GENERAL RULES (both modes):
- Never use quotation marks around service or place names — use **bold** instead.
- Always respond in clear, well-structured text.
- Do not repeat the user's question back to them.
- Do not say "As an AI language model..." or similar phrases.
- Keep responses focused and avoid unnecessary filler text.
`;

async function askGemini(message: string, context?: string) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!API_KEY) throw new Error("GEMINI_API_KEY not set");

  const userContent = context
    ? `DATABASE RESULTS FROM AASPASS:\n${context}\n\nUSER QUESTION: ${message}`
    : `USER QUESTION: ${message}`;

  const body = {
    systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "<empty>";
}

async function run() {
  const tests: Array<{ prompt: string; context?: string }> = [
    { prompt: "find hostels in Bhubaneswar", context: "NONE" },
    { prompt: "show me gyms", context: "NONE" },
    { prompt: "what is the capital of France" },
    { prompt: "help me with my physics assignment" },
    { prompt: "find a hostel in Mumbai", context: "NONE" },
  ];

  for (const t of tests) {
    const reply = await askGemini(t.prompt, t.context);
    console.log("\n====================================================");
    console.log("PROMPT:", t.prompt);
    console.log("CONTEXT:", t.context ?? "<none>");
    console.log("REPLY:\n", reply);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
