import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPremiumAccess } from "@/lib/premium";

// ==================== QUERY UNDERSTANDING MODULE ====================

interface ExtractedFilters {
  serviceType?: string;
  location?: string;
  gender?: string;
  maxPrice?: number;
  minPrice?: number;
  wifi?: boolean;
  foodIncluded?: boolean;
  laundryIncluded?: boolean;
  isAC?: boolean;
  hasMedical?: boolean;
  occupancy?: number;
  nearbyLandmark?: string;
}

async function extractFiltersWithLLM(query: string): Promise<ExtractedFilters> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return extractFiltersManual(query);

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
            content: `You are a filter extraction engine for a student accommodation platform in India.
Given a user's natural language query (in English, Hindi, or Hinglish), extract structured search filters.

Return ONLY valid JSON with these optional fields:
{
  "serviceType": "HOSTEL"|"PG"|"LIBRARY"|"COACHING"|"MESS"|"LAUNDRY"|"GYM"|"COWORKING",
  "location": "city or area name",
  "gender": "MALE"|"FEMALE",
  "maxPrice": number,
  "minPrice": number,
  "wifi": true/false,
  "foodIncluded": true/false,
  "laundryIncluded": true/false,
  "isAC": true/false,
  "hasMedical": true/false,
  "occupancy": number (sharing),
  "nearbyLandmark": "landmark name"
}

Rules:
- "girls hostel" → gender: "FEMALE", serviceType: "HOSTEL"
- "boys pg" → gender: "MALE", serviceType: "PG"
- "under 9000" or "below 9000" → maxPrice: 9000
- "above 5000" → minPrice: 5000
- "near Allen" or "near KIIT" → nearbyLandmark: "Allen" or "KIIT"
- "with food" or "khana included" → foodIncluded: true
- "wifi wala" or "with wifi" → wifi: true
- "AC room" → isAC: true
- "single room" or "single occupancy" → occupancy: 1
- "double sharing" → occupancy: 2
- "triple sharing" → occupancy: 3
- Hindi: "ladkiyon ka hostel" → gender: "FEMALE", serviceType: "HOSTEL"
- Hindi: "kota mein" → location: "Kota"
- Only include fields you are confident about. Omit uncertain fields.
- Return ONLY the JSON object, nothing else.`,
          },
          { role: "user", content: query },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return extractFiltersManual(query);

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    const filters = JSON.parse(jsonStr);
    return filters as ExtractedFilters;
  } catch (error) {
    console.error("LLM filter extraction failed, falling back to manual:", error);
    return extractFiltersManual(query);
  }
}

// Manual fallback filter extraction (no LLM needed)
function extractFiltersManual(query: string): ExtractedFilters {
  const q = query.toLowerCase();
  const filters: ExtractedFilters = {};

  // Service type
  const typeMap: Record<string, string> = {
    hostel: "HOSTEL", hostels: "HOSTEL",
    pg: "PG", "paying guest": "PG", "paying-guest": "PG",
    library: "LIBRARY", libraries: "LIBRARY",
    coaching: "COACHING", tuition: "COACHING", classes: "COACHING", institute: "COACHING",
    mess: "MESS", food: "MESS", tiffin: "MESS", khana: "MESS",
    laundry: "LAUNDRY", washing: "LAUNDRY", dhobi: "LAUNDRY",
    gym: "GYM", fitness: "GYM", workout: "GYM",
    coworking: "COWORKING", "co-working": "COWORKING",
  };
  for (const [word, type] of Object.entries(typeMap)) {
    if (q.includes(word)) { filters.serviceType = type; break; }
  }

  // Gender
  if (/girls|girl|female|ladies|women|ladki|mahila/.test(q)) filters.gender = "FEMALE";
  else if (/boys|boy|male|men|gents|ladka/.test(q)) filters.gender = "MALE";

  // Price
  const underMatch = q.match(/(?:under|below|less than|max|upto|within|budget)\s*(?:rs\.?|₹|inr)?\s*(\d{3,6})/);
  if (underMatch) filters.maxPrice = parseInt(underMatch[1]);
  const aboveMatch = q.match(/(?:above|over|more than|min|atleast|at least)\s*(?:rs\.?|₹|inr)?\s*(\d{3,6})/);
  if (aboveMatch) filters.minPrice = parseInt(aboveMatch[1]);
  // Handle "5000 se 10000" style
  const rangeMatch = q.match(/(\d{3,6})\s*(?:to|se|-)\s*(\d{3,6})/);
  if (rangeMatch) {
    filters.minPrice = parseInt(rangeMatch[1]);
    filters.maxPrice = parseInt(rangeMatch[2]);
  }

  // Amenities
  if (/wifi|wi-fi|internet|wifi wala/.test(q)) filters.wifi = true;
  if (/food|khana|meals?|tiffin|breakfast|lunch|dinner/.test(q)) filters.foodIncluded = true;
  if (/laundry|washing|kapde|dhobi/.test(q)) filters.laundryIncluded = true;
  if (/\bac\b|air.?condition|cooling/.test(q)) filters.isAC = true;
  if (/medical|clinic|doctor|hospital/.test(q)) filters.hasMedical = true;

  // Occupancy
  const occMatch = q.match(/(\d)\s*(?:sharing|share|bed|seater)/);
  if (occMatch) filters.occupancy = parseInt(occMatch[1]);
  if (/single\s*(?:room|sharing|occupancy)?/.test(q)) filters.occupancy = 1;
  if (/double\s*(?:room|sharing)?/.test(q)) filters.occupancy = 2;
  if (/triple\s*(?:room|sharing)?/.test(q)) filters.occupancy = 3;

  // Location — try to extract from "in <city>" or "near <landmark>"
  const nearMatch = q.match(/(?:near|close to|next to|nearby|paas mein)\s+(.+?)(?:\s+(?:with|under|below|above|in|for|and|wifi|food|ac)|$)/);
  if (nearMatch) filters.nearbyLandmark = nearMatch[1].trim().replace(/[.,!?]/g, "");

  const inMatch = q.match(/(?:in|at)\s+([a-zA-Z\s]+?)(?:\s+(?:under|below|above|with|for|and|near)|[.,!?]|$)/);
  if (inMatch) {
    const loc = inMatch[1].trim();
    // If it looks like a city name (not a facility keyword)
    if (loc.length > 2 && !typeMap[loc.toLowerCase()]) {
      filters.location = loc;
    }
  }

  return filters;
}

// ==================== DATABASE SEARCH LOGIC ====================

async function searchProperties(filters: ExtractedFilters) {
  const where: any = { status: "VERIFIED" };

  if (filters.serviceType) where.serviceType = filters.serviceType;
  if (filters.gender) where.forGender = filters.gender;
  if (filters.isAC) where.isAC = true;
  if (filters.wifi) where.hasWifi = true;
  if (filters.foodIncluded) where.foodIncluded = true;
  if (filters.laundryIncluded) where.laundryIncluded = true;
  if (filters.hasMedical) where.hasMedical = true;
  if (filters.occupancy) where.occupancy = filters.occupancy;

  // Price range
  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price.gte = filters.minPrice;
    if (filters.maxPrice) where.price.lte = filters.maxPrice;
  }

  // Location + landmark — use OR for broad matching
  if (filters.location || filters.nearbyLandmark) {
    const locationConditions: any[] = [];
    if (filters.location) {
      locationConditions.push(
        { city: { contains: filters.location, mode: "insensitive" } },
        { address: { contains: filters.location, mode: "insensitive" } },
        { state: { contains: filters.location, mode: "insensitive" } },
        { nearbyLandmark: { contains: filters.location, mode: "insensitive" } },
      );
    }
    if (filters.nearbyLandmark) {
      locationConditions.push(
        { nearbyLandmark: { contains: filters.nearbyLandmark, mode: "insensitive" } },
        { address: { contains: filters.nearbyLandmark, mode: "insensitive" } },
        { name: { contains: filters.nearbyLandmark, mode: "insensitive" } },
        { city: { contains: filters.nearbyLandmark, mode: "insensitive" } },
      );
    }
    where.OR = locationConditions;
  }

  const properties = await prisma.property.findMany({
    where,
    include: {
      images: { take: 1 },
      owner: { select: { name: true, phone: true } },
    },
    take: 10,
  });

  return properties;
}

// ==================== RELEVANCE RANKING ====================

function rankResults(properties: any[], filters: ExtractedFilters) {
  return properties
    .map((p) => {
      let score = 0;

      // Rating score (0-25)
      score += (p.avgRating / 5) * 25;

      // Review count score (0-10)
      score += Math.min(p.totalReviews / 10, 1) * 10;

      // Price suitability (0-20): closer to budget = better
      if (filters.maxPrice) {
        const priceRatio = p.price / filters.maxPrice;
        if (priceRatio <= 1) score += (1 - priceRatio * 0.5) * 20;
      } else {
        score += 10; // neutral if no budget specified
      }

      // Amenity match bonus (0-20)
      if (filters.wifi && p.hasWifi) score += 5;
      if (filters.foodIncluded && p.foodIncluded) score += 5;
      if (filters.laundryIncluded && p.laundryIncluded) score += 5;
      if (filters.isAC && p.isAC) score += 5;

      // Gender match (0-10)
      if (filters.gender && p.forGender === filters.gender) score += 10;
      if (!filters.gender && !p.forGender) score += 5;

      // Location match bonus (0-15)
      if (filters.location) {
        const loc = filters.location.toLowerCase();
        if (p.city?.toLowerCase().includes(loc)) score += 15;
        else if (p.address?.toLowerCase().includes(loc)) score += 10;
        else if (p.nearbyLandmark?.toLowerCase()?.includes(loc)) score += 12;
      }
      if (filters.nearbyLandmark) {
        const lm = filters.nearbyLandmark.toLowerCase();
        if (p.nearbyLandmark?.toLowerCase()?.includes(lm)) score += 15;
        else if (p.address?.toLowerCase().includes(lm)) score += 8;
      }

      return { ...p, _relevanceScore: Math.round(score) };
    })
    .sort((a, b) => b._relevanceScore - a._relevanceScore);
}

// ==================== RESPONSE FORMATTER ====================

function formatResponse(
  properties: any[],
  filters: ExtractedFilters,
  query: string
) {
  if (properties.length === 0) {
    return {
      message: `I couldn't find any properties matching your query. Try adjusting your filters or browse all services.`,
      filters,
      results: [],
      totalResults: 0,
    };
  }

  const results = properties.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    serviceType: p.serviceType,
    price: p.price,
    city: p.city,
    address: p.address,
    state: p.state,
    avgRating: p.avgRating,
    totalReviews: p.totalReviews,
    isAC: p.isAC,
    hasWifi: p.hasWifi,
    foodIncluded: p.foodIncluded,
    laundryIncluded: p.laundryIncluded,
    hasMedical: p.hasMedical,
    forGender: p.forGender,
    occupancy: p.occupancy,
    nearbyLandmark: p.nearbyLandmark,
    image: p.images?.[0]?.url || null,
    ownerName: p.owner?.name || null,
    relevanceScore: p._relevanceScore,
  }));

  return {
    message: `Found ${results.length} matching ${filters.serviceType?.toLowerCase() || "properties"} for you!`,
    filters,
    results,
    totalResults: results.length,
  };
}

// ==================== LLM SUMMARY (optional enrichment) ====================

async function generateAISummary(
  query: string,
  results: any[],
  filters: ExtractedFilters
): Promise<string | null> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY || results.length === 0) return null;

  try {
    const propertiesSummary = results
      .slice(0, 5)
      .map(
        (r, i) =>
          `${i + 1}. ${r.name} (${r.serviceType}) in ${r.city} — ₹${r.price}/mo, ${r.avgRating}★, ${r.hasWifi ? "WiFi" : ""} ${r.foodIncluded ? "Food" : ""} ${r.isAC ? "AC" : ""} ${r.forGender === "MALE" ? "Boys" : r.forGender === "FEMALE" ? "Girls" : "Co-ed"}`
      )
      .join("\n");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
              content: `You are AasPass AI, a student accommodation assistant in India. The user searched for properties and got results. Write a brief, friendly 2-3 sentence summary of the results. Use emoji. Mention the top pick briefly. Be concise. Reply in the same language the user used.`,
            },
            {
              role: "user",
              content: `User query: "${query}"\n\nResults:\n${propertiesSummary}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      }
    );
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ==================== API ENDPOINT ====================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Please sign in to use AI search" }, { status: 401 });
    }

    // 🔒 HARD GATE — verify premium from DB including expiry check
    const premiumCheck = await checkPremiumAccess(session.user.id!);
    if (!premiumCheck.allowed) {
      // Allow admins through even without premium
      const user = await prisma.user.findUnique({
        where: { id: session.user.id! },
        select: { role: true },
      });
      if (user?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "AI Search is a premium feature. Upgrade to access.", reason: premiumCheck.reason },
          { status: 403 }
        );
      }
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a search query (at least 3 characters)" },
        { status: 400 }
      );
    }

    // Step 1: Extract filters using LLM
    const filters = await extractFiltersWithLLM(query.trim());

    // Step 2: Search database
    const properties = await searchProperties(filters);

    // Step 3: Rank results by relevance
    const ranked = rankResults(properties, filters);

    // Step 4: Format response
    const response = formatResponse(ranked, filters, query);

    // Step 5: Generate AI summary (optional, non-blocking)
    const aiSummary = await generateAISummary(query, response.results, filters);
    if (aiSummary) response.message = aiSummary;

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/ai-search error:", error);
    return NextResponse.json(
      { error: "AI search failed. Please try again." },
      { status: 500 }
    );
  }
}
