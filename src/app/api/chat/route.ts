import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkPremiumAccess } from "@/lib/premium";

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

type ServiceSearchMeta = {
  isServiceQuery: boolean;
  requestedServiceType: string | null;
  requestedCityKeywords: string[];
  cityFilterApplied: boolean;
  exactCityMatchCount: number;
  fallbackUsed: boolean;
  fallbackCount: number;
  noExactCityMatch: boolean;
};

type ChatHistoryItem = {
  content: string;
  isAI: boolean;
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

//////////////////////////////
// 🔹 GET CHAT HISTORY
//////////////////////////////

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id! },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, isAI: true, createdAt: true },
    });

    const conversations: { id: string; title: string; lastMessage: string; timestamp: string; messages: typeof messages }[] = [];
    let current: { id: string; title: string; lastMessage: string; timestamp: string; messages: typeof messages } | null = null;

    for (const msg of messages) {
      const msgTime = new Date(msg.createdAt).getTime();
      const gap = current
        ? msgTime - new Date(current.messages[current.messages.length - 1].createdAt).getTime()
        : Infinity;

      if (!current || gap > 30 * 60 * 1000) {
        const title = !msg.isAI ? msg.content.slice(0, 50) : "Chat";
        current = {
          id: msg.id,
          title,
          lastMessage: msg.content.slice(0, 80),
          timestamp: msg.createdAt.toISOString(),
          messages: [msg],
        };
        conversations.push(current);
      } else {
        current.messages.push(msg);
        current.lastMessage = msg.content.slice(0, 80);
      }
    }

    return NextResponse.json({ conversations: conversations.reverse() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }
}

//////////////////////////////
// 🔹 HELPERS
//////////////////////////////

const STOP_WORDS = new Set([
  "i","me","my","we","our","you","your","he","she","they","them","it","is","are","was","were",
  "am","be","been","to","for","in","on","at","of","a","an","the","and","or","with","without",
]);

function extractKeywords(message: string) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
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

//////////////////////////////
// 🔥 STRICT SERVICE DETECTION
//////////////////////////////

function isStrictServiceQuery(message: string) {
  const lower = message.toLowerCase();
  const normalizedWords = extractKeywords(message).map(normalizeToken);

  const serviceKeywords = new Set([
    "hostel", "pg", "paying guest", "library", "mess",
    "laundry", "gym", "coworking", "co-working", "room", "accommodation",
    "tiffin", "food", "stay", "rent", "flat", "bed", "service", "services",
  ]);

  const locationPatterns = [
    /\bnear\s+\w+/i,
    /\bin\s+\w+/i,
    /\bat\s+\w+/i,
    /\baround\s+\w+/i,
    /\bfind\s+\w+/i,
    /\bshow\s+\w+/i,
  ];

  const hasServiceKeyword = Array.from(serviceKeywords).some((k) => lower.includes(k))
    || normalizedWords.some((w) => serviceKeywords.has(w));
  const hasLocationPattern = locationPatterns.some((p) => p.test(lower));

  // Treat as service query if either condition is true.
  return hasServiceKeyword || hasLocationPattern;
}

//////////////////////////////
// 🔹 DB FETCH
//////////////////////////////

async function getRelevantProperties(message: string): Promise<{ properties: ChatProperty[]; searchMeta: ServiceSearchMeta }> {
  const keywords = extractKeywords(message);
  const normalizedKeywords = keywords.map(normalizeToken);
  const lowered = message.toLowerCase();

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
    accommodation: "HOSTEL",
    room: "HOSTEL",
    stay: "HOSTEL",
  };

  let serviceType: string | undefined;
  let matchedTypeKey: string | null = null;

  for (const [key, value] of Object.entries(typeMap)) {
    if (lowered.includes(key)) {
      serviceType = value;
      matchedTypeKey = key;
      break;
    }
  }

  const nonServiceWordsRaw = [
    ...Object.keys(typeMap),
    "find", "show", "get", "best", "good", "near", "around",
    "available", "looking", "want", "need", "search", "any",
    "please", "help", "option", "options", "service", "services", "for", "what", "is",
  ];
  const nonServiceWords = new Set(nonServiceWordsRaw.map(normalizeToken));

  const locationKeywords = normalizedKeywords.filter((k) =>
    !nonServiceWords.has(k) && k.length > 2
  );

  const uniqueLocationKeywords = Array.from(new Set(locationKeywords));
  console.log("Service type:", serviceType);
  console.log("Location keywords:", uniqueLocationKeywords);

  const baseWhere: Record<string, unknown> = { status: "VERIFIED" };
  if (serviceType) baseWhere.serviceType = serviceType;

  // If no location keywords, return top-rated services of that type.
  if (uniqueLocationKeywords.length === 0) {
    const properties = await prisma.property.findMany({
      where: baseWhere,
      orderBy: [{ avgRating: "desc" }],
      take: 5,
      include: { images: { take: 1 } },
    }) as ChatProperty[];

    console.log("DB returned properties:", properties.map((p) => p.name));
    return {
      properties,
      searchMeta: {
        isServiceQuery: true,
        requestedServiceType: serviceType ?? null,
        requestedCityKeywords: [],
        cityFilterApplied: false,
        exactCityMatchCount: properties.length,
        fallbackUsed: false,
        fallbackCount: 0,
        noExactCityMatch: false,
      },
    };
  }

  // Search location keywords across all location fields.
  const locationConditions = uniqueLocationKeywords.flatMap((keyword) => [
    { city: { contains: keyword, mode: "insensitive" as const } },
    { address: { contains: keyword, mode: "insensitive" as const } },
    { nearbyLandmark: { contains: keyword, mode: "insensitive" as const } },
    { name: { contains: keyword, mode: "insensitive" as const } },
    { description: { contains: keyword, mode: "insensitive" as const } },
  ]);

  const results = await prisma.property.findMany({
    where: {
      ...baseWhere,
      OR: locationConditions,
    },
    orderBy: [{ avgRating: "desc" }],
    take: 5,
    include: { images: { take: 1 } },
  }) as ChatProperty[];

  console.log("Results with location filter:", results.map((p) => p.name));

  if (results.length > 0) {
    return {
      properties: results,
      searchMeta: {
        isServiceQuery: true,
        requestedServiceType: serviceType ?? null,
        requestedCityKeywords: uniqueLocationKeywords,
        cityFilterApplied: true,
        exactCityMatchCount: results.length,
        fallbackUsed: false,
        fallbackCount: 0,
        noExactCityMatch: false,
      },
    };
  }

  // Fallback 1: try without service type restriction.
  const canRelaxType = serviceType && (!matchedTypeKey || ["accommodation", "room", "stay"].includes(matchedTypeKey));

  if (canRelaxType) {
    const withoutTypeResults = await prisma.property.findMany({
      where: {
        status: "VERIFIED",
        OR: locationConditions,
      },
      orderBy: [{ avgRating: "desc" }],
      take: 5,
      include: { images: { take: 1 } },
    }) as ChatProperty[];

    console.log("Results without type filter:", withoutTypeResults.map((p) => p.name));
    if (withoutTypeResults.length > 0) {
      return {
        properties: withoutTypeResults,
        searchMeta: {
          isServiceQuery: true,
          requestedServiceType: serviceType ?? null,
          requestedCityKeywords: uniqueLocationKeywords,
          cityFilterApplied: true,
          exactCityMatchCount: 0,
          fallbackUsed: true,
          fallbackCount: withoutTypeResults.length,
          noExactCityMatch: false,
        },
      };
    }
  }

  // Fallback 2: try each location keyword independently.
  const fallbackBaseWhere: Record<string, unknown> = canRelaxType
    ? { status: "VERIFIED" }
    : baseWhere;

  for (const keyword of uniqueLocationKeywords) {
    const singleKeywordResults = await prisma.property.findMany({
      where: {
        ...fallbackBaseWhere,
        OR: [
          { city: { contains: keyword, mode: "insensitive" } },
          { address: { contains: keyword, mode: "insensitive" } },
          { nearbyLandmark: { contains: keyword, mode: "insensitive" } },
          { name: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
        ],
      },
      orderBy: [{ avgRating: "desc" }],
      take: 5,
      include: { images: { take: 1 } },
    }) as ChatProperty[];

    console.log(`Results for keyword "${keyword}":`, singleKeywordResults.map((p) => p.name));
    if (singleKeywordResults.length > 0) {
      return {
        properties: singleKeywordResults,
        searchMeta: {
          isServiceQuery: true,
          requestedServiceType: serviceType ?? null,
          requestedCityKeywords: uniqueLocationKeywords,
          cityFilterApplied: true,
          exactCityMatchCount: 0,
          fallbackUsed: true,
          fallbackCount: singleKeywordResults.length,
          noExactCityMatch: false,
        },
      };
    }
  }

  // Fallback 3: try full phrase match.
  const fullPhrase = uniqueLocationKeywords.join(" ").trim();
  const fullMessageResults = await prisma.property.findMany({
    where: {
      ...fallbackBaseWhere,
      OR: [
        { address: { contains: fullPhrase, mode: "insensitive" } },
        { nearbyLandmark: { contains: fullPhrase, mode: "insensitive" } },
        { name: { contains: fullPhrase, mode: "insensitive" } },
      ],
    },
    orderBy: [{ avgRating: "desc" }],
    take: 5,
    include: { images: { take: 1 } },
  }) as ChatProperty[];

  console.log("Full message search results:", fullMessageResults.map((p) => p.name));

  return {
    properties: fullMessageResults,
    searchMeta: {
      isServiceQuery: true,
      requestedServiceType: serviceType ?? null,
      requestedCityKeywords: uniqueLocationKeywords,
      cityFilterApplied: true,
      exactCityMatchCount: 0,
      fallbackUsed: fullMessageResults.length > 0,
      fallbackCount: fullMessageResults.length,
      noExactCityMatch: fullMessageResults.length === 0,
    },
  };
}

async function getConversationHistory(userId: string, limit = 6): Promise<ChatHistoryItem[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { content: true, isAI: true },
  });

  return messages.reverse();
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

//////////////////////////////
// 🔹 GROQ CALL
//////////////////////////////

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
    ? `[INTERNAL CONTEXT — DO NOT REPEAT THIS BLOCK. USE ONLY THESE SERVICES]:
${propertyContext}

[USER ASKED]: ${message}

Respond naturally. If the services shown are near the location the user asked about (based on address or landmark), mention that. Do not print raw context. Do not say "DATABASE RESULTS". Be helpful and conversational.`
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

//////////////////////////////
// 🚀 POST MAIN LOGIC
//////////////////////////////

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { allowed } = await checkPremiumAccess(session.user.id!);
    if (!allowed) {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const history = await getConversationHistory(session.user.id!, 6);

    await prisma.chatMessage.create({
      data: { content: message, isAI: false, userId: session.user.id! },
    });

    let reply = "";
    let properties: ChatProperty[] = [];
    let searchMeta: ServiceSearchMeta | null = null;

    const isServiceQuery = isStrictServiceQuery(message);

    if (isServiceQuery) {
      // SERVICE MODE — only use AasPass DB
      const searchResult = await getRelevantProperties(message);
      properties = searchResult.properties;
      searchMeta = searchResult.searchMeta;
      const context = formatPropertyForResponse(properties);

      if (properties.length === 0) {
        // Tell Groq no results found — let it respond naturally
        reply = (await generateGroqReply(message, "NONE", history)) ||
          "I couldn't find any matching services on AasPass right now. Try a different location or service type.";
      } else {
        // Pass real DB results as context to Groq
        reply = (await generateGroqReply(message, context, history)) ||
          `Here are some services I found on AasPass:\n\n${context}`;
      }

    } else {
      // NORMAL CHAT MODE — pure Groq, no DB
      reply = (await generateGroqReply(message, undefined, history)) ||
        "I'm here to help! You can ask me anything, or ask me to find hostels, PGs, gyms, and other student services near you.";
    }

    await prisma.chatMessage.create({
      data: { content: reply, isAI: true, userId: session.user.id! },
    });

    return NextResponse.json({
      reply,
      properties,
      searchMeta,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "Something went wrong." }, { status: 500 });
  }
}
