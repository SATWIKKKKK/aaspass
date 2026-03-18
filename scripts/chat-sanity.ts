import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local", override: true });
} else {
  loadEnv();
}

type PrismaClientLike = {
  property: {
    findMany: (args: unknown) => Promise<unknown>;
  };
  $disconnect: () => Promise<void>;
};

type ChatProperty = {
  id: string;
  name: string;
  slug: string;
  serviceType: string;
  city: string;
  address: string;
  price: number;
  avgRating: number;
  totalReviews: number;
  forGender: "MALE" | "FEMALE" | "OTHER" | null;
  nearbyLandmark: string | null;
  isAC: boolean;
  hasWifi: boolean;
  foodIncluded: boolean;
  laundryIncluded: boolean;
  hasMedical: boolean;
  images: { url: string }[];
};

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
- CRITICAL: Never mention any service name that is not explicitly listed in the INTERNAL CONTEXT block. If you are tempted to suggest a service not in the context, stop and say no services are available instead.

CONVERSATION CONTINUITY:
- You will receive previous conversation messages as history.
- Use this history to understand follow-up questions like "by price", "which is cheapest", "tell me more about the first one".
- Never ask the user to "provide DATABASE RESULTS" — that is internal context you receive, not something the user provides.
- If a follow-up question refers to services mentioned earlier in the conversation, use those same services to answer.
- Maintain context across the entire conversation naturally.
`;

type ChatHistoryItem = {
  content: string;
  isAI: boolean;
};

const STOP_WORDS = new Set([
  "i","me","my","we","our","you","your","he","she","they","them","it","is","are","was","were",
  "am","be","been","to","for","in","on","at","of","a","an","the","and","or","with","without",
]);

function extractKeywords(message: string) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function normalizeToken(word: string) {
  if (word.endsWith("ies") && word.length > 3) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("es") && word.length > 3) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s") && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

function isStrictServiceQuery(message: string) {
  const lower = message.toLowerCase();
  const normalizedWords = extractKeywords(message).map(normalizeToken);
  const serviceKeywords = new Set([
    "hostel", "pg", "paying guest", "library", "mess",
    "laundry", "gym", "coworking", "co-working", "room", "accommodation",
    "tiffin", "food", "stay", "rent", "flat", "bed", "service", "services"
  ]);

  return Array.from(serviceKeywords).some((k) => lower.includes(k))
    || normalizedWords.some((w) => serviceKeywords.has(w));
}

async function getRelevantProperties(prisma: PrismaClientLike, message: string): Promise<ChatProperty[]> {
  const keywords = extractKeywords(message);
  const normalizedKeywords = keywords.map(normalizeToken);
  const lowerMessage = message.toLowerCase();

  const typeMap: Record<string, string> = {
    hostel: "HOSTEL",
    pg: "PG",
    "paying guest": "PG",
    library: "LIBRARY",
    mess: "MESS",
    tiffin: "MESS",
    gym: "GYM",
    laundry: "LAUNDRY",
    coworking: "COWORKING",
    "co-working": "COWORKING",
  };

  let serviceType: string | undefined;

  if (lowerMessage.includes("paying guest")) {
    serviceType = "PG";
  } else {
    for (const k of normalizedKeywords) {
      if (typeMap[k]) {
        serviceType = typeMap[k];
        break;
      }
    }
  }

  const serviceTokens = new Set(Object.keys(typeMap).map(normalizeToken));

  const cityKeywords = normalizedKeywords.filter((k) =>
    !serviceTokens.has(k) &&
    k.length > 3 &&
    !["find", "show", "get", "best", "good", "near", "around", "available"].includes(k)
  );
  const uniqueCityKeywords = Array.from(new Set(cityKeywords));

  const where: Record<string, unknown> = { status: "VERIFIED" };
  if (serviceType) where.serviceType = serviceType;
  if (uniqueCityKeywords.length > 0) {
    where.OR = uniqueCityKeywords.map((city) => ({ city: { contains: city, mode: "insensitive" } }));
  }

  let properties: ChatProperty[] = [];
  try {
    properties = await prisma.property.findMany({
      where,
      orderBy: [{ avgRating: "desc" }],
      take: 5,
      include: { images: { take: 1 } },
    }) as ChatProperty[];
    console.log("DB returned properties:", properties.map((p) => p.name));
  } catch (err) {
    console.error("DB lookup failed for primary query:", err);
    return [];
  }

  return properties;
}

function formatPropertyForResponse(properties: ChatProperty[]) {
  if (properties.length === 0) return "NONE";

  return properties.map((p, i) => {
    const amenities = [
      p.hasWifi && "WiFi",
      p.isAC && "AC",
      p.foodIncluded && "Food included",
      p.laundryIncluded && "Laundry",
      p.hasMedical && "Medical",
    ].filter(Boolean).join(", ");

    return `
SERVICE ${i + 1}:
Name: ${p.name}
Type: ${p.serviceType}
Location: ${p.address}, ${p.city}
${p.nearbyLandmark ? `Landmark: ${p.nearbyLandmark}` : ""}
Price: ₹${p.price}/month
Rating: ${p.avgRating}/5 (${p.totalReviews} reviews)
${p.forGender ? `For: ${p.forGender}` : ""}
${amenities ? `Amenities: ${amenities}` : ""}
Link: /services/${p.slug}
`.trim();
  }).join("\n\n---\n\n");
}

async function generateGroqReply(
  message: string,
  propertyContext?: string,
  history?: ChatHistoryItem[]
): Promise<string | null> {
  const API_KEY = process.env.GROQ_API_KEY;
  const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (!API_KEY) {
    console.error("GROQ_API_KEY is not set");
    return null;
  }

  const userContent = propertyContext && propertyContext !== "NONE"
    ? `[INTERNAL CONTEXT — DO NOT REPEAT OR MENTION THIS BLOCK IN YOUR RESPONSE. USE ONLY THESE SERVICES TO ANSWER]:
${propertyContext}

[USER ASKED]: ${message}

Now respond naturally to the user using only the services above. Do not print the context block. Do not say "DATABASE RESULTS". Just answer helpfully.`
    : propertyContext === "NONE"
      ? `[USER ASKED]: ${message}

No services were found in AasPass for this query. Tell the user no services are available and suggest they try a different location or service type.`
      : `[USER ASKED]: ${message}`;

  const conversationMessages = (history ?? []).map((msg) => ({
    role: msg.isAI ? "assistant" : "user",
    content: msg.content,
  }));

  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  };

  const maxAttempts = 3;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();

        if (res.status === 429 && attempt < maxAttempts) {
          const waitMs = 1200 * attempt;
          console.warn(`Groq rate-limited (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms`);
          await sleep(waitMs);
          continue;
        }

        console.error("Groq API error:", res.status, errorText);
        return null;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || null;

      if (!text) {
        console.error("Groq returned empty response:", JSON.stringify(data));
      }

      return text;
    } catch (err) {
      if (attempt < maxAttempts) {
        const waitMs = 1200 * attempt;
        console.warn(`Groq fetch error (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      console.error("Groq fetch error:", err);
      return null;
    }
  }

  return null;
}

async function run() {
  const { default: prisma } = await import("../src/lib/prisma");

  const tests = [
    "services in jaipur",
    "hostels in Bhubaneswar",
    "by price",
    "under 1500",
    "laundry in Pune",
    "what is photosynthesis",
  ];

  const history: ChatHistoryItem[] = [];

  for (const message of tests) {
    const isService = isStrictServiceQuery(message);
    let properties: ChatProperty[] = [];
    let reply: string | null = null;

    if (isService) {
      properties = await getRelevantProperties(prisma as PrismaClientLike, message);
      const context = formatPropertyForResponse(properties);
      if (properties.length === 0) {
        reply = await generateGroqReply(message, "NONE", history);
      } else {
        reply = await generateGroqReply(message, context, history);
      }
    } else {
      reply = await generateGroqReply(message, undefined, history);
    }

    history.push({ content: message, isAI: false });
    if (reply) history.push({ content: reply, isAI: true });

    console.log("\n====================================================");
    console.log("PROMPT:", message);
    console.log("SERVICE MODE:", isService);
    console.log("DB COUNT:", properties.length);
    console.log("REPLY:\n", reply || "<null>");
  }

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  try {
    const { default: prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect failures in cleanup path.
  }
  process.exit(1);
});
