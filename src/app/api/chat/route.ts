import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkPremiumAccess } from "@/lib/premium";

// GET /api/chat — Load chat history for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id! },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, isAI: true, createdAt: true },
    });

    // Group messages into conversations by 30-minute gaps
    const conversations: { id: string; title: string; lastMessage: string; timestamp: string; messages: typeof messages }[] = [];
    let current: typeof conversations[0] | null = null;

    for (const msg of messages) {
      const msgTime = new Date(msg.createdAt).getTime();
      const gap = current ? msgTime - new Date(current.messages[current.messages.length - 1].createdAt).getTime() : Infinity;

      if (!current || gap > 30 * 60 * 1000) {
        // Start new conversation — use first user message as title
        const title = !msg.isAI ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "") : "Chat";
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
    console.error("GET /api/chat error:", error);
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }
}

// DB-aware AI chat that reads actual properties and answers intelligently
// Uses Groq (free Llama API) if GROQ_API_KEY is set, otherwise uses smart DB-based responses

async function getRelevantProperties(message: string) {
  const keywords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Try to extract service type from message
  const typeMap: Record<string, string> = {
    hostel: "HOSTEL", hostels: "HOSTEL",
    pg: "PG", "paying guest": "PG",
    library: "LIBRARY", libraries: "LIBRARY",
    coaching: "COACHING", tuition: "COACHING", classes: "COACHING",
    mess: "MESS", food: "MESS", tiffin: "MESS",
    laundry: "LAUNDRY", washing: "LAUNDRY",
    gym: "GYM", fitness: "GYM", workout: "GYM",
    coworking: "COWORKING", "co-working": "COWORKING", office: "COWORKING",
  };

  let serviceType: string | undefined;
  for (const keyword of keywords) {
    if (typeMap[keyword]) {
      serviceType = typeMap[keyword];
      break;
    }
  }

  // Try to extract city from message
  const cityKeywords = keywords.filter((k) => k.length > 3 && !typeMap[k]);

  const where: any = { status: "VERIFIED" };
  if (serviceType) where.serviceType = serviceType;

  // Build city search from remaining keywords
  if (cityKeywords.length > 0) {
    where.OR = cityKeywords.map((k) => ({
      OR: [
        { city: { contains: k, mode: "insensitive" } },
        { name: { contains: k, mode: "insensitive" } },
        { address: { contains: k, mode: "insensitive" } },
        { nearbyLandmark: { contains: k, mode: "insensitive" } },
      ],
    }));
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { avgRating: "desc" },
    take: 5,
    include: {
      images: { take: 1 },
    },
  });

  return properties;
}

function formatPropertyForResponse(properties: any[]) {
  if (properties.length === 0) return "";

  return properties.map((p, i) => {
    const amenities = [];
    if (p.isAC) amenities.push("AC");
    if (p.hasWifi) amenities.push("WiFi");
    if (p.foodIncluded) amenities.push("Food");
    if (p.laundryIncluded) amenities.push("Laundry");
    if (p.hasMedical) amenities.push("Medical");

    return `${i + 1}. **${p.name}** (${p.serviceType})
   📍 ${p.address}, ${p.city}
   💰 ₹${p.price}/month
   ⭐ ${p.avgRating.toFixed(1)} (${p.totalReviews} reviews)
   ${amenities.length > 0 ? `✅ ${amenities.join(", ")}` : ""}
   ${p.forGender ? `👤 ${p.forGender === "MALE" ? "Boys" : "Girls"} only` : ""}
   ${p.nearbyLandmark ? `📌 Near ${p.nearbyLandmark}` : ""}`;
  }).join("\n\n");
}

function generateSmartResponse(message: string, properties: any[]) {
  const lowerMsg = message.toLowerCase();
  const hasProperties = properties.length > 0;

  // Greeting detection
  if (/^(hi|hello|hey|good morning|good evening|namaste)/.test(lowerMsg)) {
    return `👋 Hello! I'm the AasPass AI Assistant. I can help you find:

🏠 Accommodation (Hostels, PGs & Flats)
🍱 Mess & Tiffin Services
🏋️ Gyms & Fitness Centers
📚 Libraries & Study Spaces
👕 Laundry Services
🚗 Transport & Commute Options

Just tell me what you're looking for and which city, and I'll find the best options for you! 🎯`;
  }

  // Price/cheap related
  if (/cheap|affordable|budget|low price|lowest/.test(lowerMsg)) {
    if (hasProperties) {
      const sorted = [...properties].sort((a, b) => a.price - b.price);
      return `💰 Here are the most affordable options I found:\n\n${formatPropertyForResponse(sorted)}\n\n💡 Tip: You can filter by price on our Services page for more options!`;
    }
    return "I'd love to help you find affordable options! Could you tell me which city and what type of service you're looking for? (e.g., 'affordable hostels in Delhi')";
  }

  // Comparison requests
  if (/compare|vs|versus|difference|better/.test(lowerMsg)) {
    if (hasProperties) {
      return `📊 Here's a comparison of the top options:\n\n${formatPropertyForResponse(properties)}\n\n💡 I'd recommend checking each property's page for detailed reviews and photos!`;
    }
    return "I can compare properties for you! Please tell me the city and service type (e.g., 'compare PGs in Bangalore')";
  }

  // Best/top/recommended
  if (/best|top|recommend|popular|good|great/.test(lowerMsg)) {
    if (hasProperties) {
      return `⭐ Here are the top-rated options:\n\n${formatPropertyForResponse(properties)}\n\n🎯 These are rated highest by our users. Click on any to see more details!`;
    }
    return "I can recommend the best options for you! What service are you looking for and in which city?";
  }

  // Location specific
  if (/near|close to|around|nearby/.test(lowerMsg)) {
    if (hasProperties) {
      return `📍 Here are the nearest options I found:\n\n${formatPropertyForResponse(properties)}\n\n📌 Check each listing for exact distances and maps!`;
    }
    return "I can find places near you! Tell me the area or landmark you're close to (e.g., 'hostels near IIT Delhi')";
  }

  // Amenity questions
  if (/wifi|ac|air condition|food|laundry|medical|ameniti/.test(lowerMsg)) {
    if (hasProperties) {
      return `✅ Here are properties matching your amenity preferences:\n\n${formatPropertyForResponse(properties)}\n\n🔍 Use our advanced filters on the Services page for precise amenity filtering!`;
    }
    return "I can filter by amenities! What service type and city are you looking at?";
  }

  // Gender specific
  if (/boys|girls|male|female|women|men|co-ed|coed/.test(lowerMsg)) {
    if (hasProperties) {
      return `👤 Here are the options matching your preference:\n\n${formatPropertyForResponse(properties)}`;
    }
    return "I can find gender-specific accommodations! Tell me the city and service type";
  }

  // General search with results
  if (hasProperties) {
    return `🔍 Here's what I found based on your query:\n\n${formatPropertyForResponse(properties)}\n\n💡 Want me to narrow it down? Tell me your budget, preferred amenities, or specific area!`;
  }

  // Fallback - help message
  return `I couldn't find specific properties matching your query. Here's how I can help:

🔍 **Search**: "Show me hostels in Delhi"
💰 **Budget**: "Affordable PGs in Bangalore under 8000"
⭐ **Best**: "Best coaching centers in Kota"
📍 **Location**: "Hostels near IIT Kharagpur"
📊 **Compare**: "Compare mess services in Bhubaneswar"

Try asking with a specific service type and city!`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 🔒 HARD GATE — check premium status from DB on every request
    const { allowed, reason } = await checkPremiumAccess(session.user.id!);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Premium required",
          reason,
          upgradeUrl: "/dashboard",
        },
        { status: 403 }
      );
    }

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    // Save user message to DB
    await prisma.chatMessage.create({
      data: { content: message, isAI: false, userId: session.user.id! },
    });

    // Get relevant properties from DB
    const properties = await getRelevantProperties(message);
    const propertyContext = properties.length > 0
      ? `\nAvailable properties from our database:\n${properties.map((p: any) =>
          `- ${p.name} (${p.serviceType}) in ${p.city}: ₹${p.price}/month, Rating: ${p.avgRating}/5, ${p.totalReviews} reviews. ${p.isAC ? "AC," : ""} ${p.hasWifi ? "WiFi," : ""} ${p.foodIncluded ? "Food," : ""} ${p.forGender ? `${p.forGender} only` : "Co-ed"}. ${p.nearbyLandmark ? `Near ${p.nearbyLandmark}` : ""}`
        ).join("\n")}`
      : "\nNo matching properties found in our database for this query.";

    let reply: string;

    // Try Groq API (free Llama) first
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (GROQ_API_KEY) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `You are AasPass AI — a helpful assistant for India's leading student-services booking platform.

STRICT RULES:
1. You may ONLY reference properties/services listed in the "DATABASE RESULTS" section below. NEVER invent, fabricate, or hallucinate service names, prices, ratings, or locations that are not in DATABASE RESULTS.
2. If DATABASE RESULTS is empty or says "No matching properties found", you MUST NOT list any specific services. Instead say: "I couldn't find matching services in our database right now. Try browsing our Services page for options."
3. When listing services FROM DATABASE RESULTS, use this format for each:
   **Service Name** (TYPE)
   📍 Location
   💰 Price/month
   ⭐ Rating
4. Use INR (₹) for all prices.
5. Keep responses concise — max 3-4 short paragraphs. Use bullet points and emojis.
6. Be warm, student-friendly, and practical.
7. Do NOT wrap service names in quotes — use **bold** markdown instead.
8. For general questions (tips, advice), give helpful guidance but do NOT make up specific service names or prices. Answer generally.
9. Mention that users can browse and book directly on AasPass.
10. CRITICAL: If a user asks a vague question like "best PG" or "hostels near me" and DATABASE RESULTS has entries, ONLY mention those entries. Do NOT add extra made-up entries to pad the list.

DATABASE RESULTS:
${propertyContext}`,
              },
              { role: "user", content: message },
            ],
            max_tokens: 600,
            temperature: 0.15,
          }),
        });
        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || generateSmartResponse(message, properties);
      } catch {
        reply = generateSmartResponse(message, properties);
      }
    } else {
      // Fallback: use smart DB-based responses (no API key needed)
      reply = generateSmartResponse(message, properties);
    }

    // Save AI response to DB
    await prisma.chatMessage.create({
      data: { content: reply, isAI: true, userId: session.user.id! },
    });

    // Return properties for frontend card rendering
    const propertyCards = properties.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      serviceType: p.serviceType,
      city: p.city,
      address: p.address,
      price: p.price,
      avgRating: p.avgRating,
      totalReviews: p.totalReviews,
      image: p.images?.[0]?.url || null,
      forGender: p.forGender,
      isAC: p.isAC,
      hasWifi: p.hasWifi,
      foodIncluded: p.foodIncluded,
    }));

    return NextResponse.json({ reply, properties: propertyCards });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json({ reply: "Sorry, something went wrong. Please try again." }, { status: 500 });
  }
}
