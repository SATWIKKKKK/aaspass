import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/owner/health-score
 *
 * Computes a weighted Service Health Score for the owner's portfolio:
 *
 *   - Photos (25%)      — ≥3 photos per service, bonus for wide-shots
 *   - Reviews (20%)     — Has reviews + average ≥ 3.5
 *   - Occupancy (20%)   — Capacity configured + fill rate
 *   - Engagement (20%)  — Views, wishlists, cart-adds in last 30 days
 *   - Recency (15%)     — Service details updated recently, active bookings
 *
 * Returns: { score, breakdown: [...], tips: [...] }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ownerId = session.user!.id!;

    const properties = await prisma.property.findMany({
      where: { ownerId },
      include: {
        images: true,
        _count: { select: { bookings: true, reviews: true, wishlistItems: true, serviceStudents: true } },
      },
    });

    if (properties.length === 0) {
      return NextResponse.json({
        score: 0,
        breakdown: [],
        tips: ["Add your first service to start building your health score."],
      });
    }

    // 1. PHOTOS SCORE (25%)
    const photoCounts = properties.map((p) => p.images.length);
    const avgPhotos = photoCounts.reduce((a, b) => a + b, 0) / properties.length;
    const hasWideShot = properties.some((p) => p.images.some((img) => img.isWideShot));
    let photoScore = Math.min(avgPhotos / 5, 1) * 0.8; // up to 80% for 5+ avg photos
    if (hasWideShot) photoScore += 0.2; // 20% bonus for wide-shots
    photoScore = Math.min(photoScore, 1);
    const photoWeighted = photoScore * 25;
    const photoTip = avgPhotos < 3 ? "Upload at least 3 high-quality photos per service" : !hasWideShot ? "Add a wide-shot photo showing the full space" : null;

    // 2. REVIEWS SCORE (20%)
    const totalReviews = properties.reduce((s, p) => s + p._count.reviews, 0);
    const avgRating = properties.reduce((s, p) => s + (p.avgRating || 0), 0) / properties.length;
    let reviewScore = 0;
    if (totalReviews > 0) reviewScore += 0.4;
    if (totalReviews >= 5) reviewScore += 0.2;
    if (avgRating >= 3.5) reviewScore += 0.2;
    if (avgRating >= 4.0) reviewScore += 0.2;
    reviewScore = Math.min(reviewScore, 1);
    const reviewWeighted = reviewScore * 20;
    const reviewTip = totalReviews === 0 ? "Encourage students to leave reviews" : avgRating < 3.5 ? "Improve service quality to boost your rating above 3.5 stars" : null;

    // 3. OCCUPANCY SCORE (20%)
    const withCapacity = properties.filter((p) => p.capacity && p.capacity > 0);
    let occupancyScore = 0;
    if (withCapacity.length > 0) {
      occupancyScore += 0.5; // has capacity configured
      const totalCap = withCapacity.reduce((s, p) => s + (p.capacity || 0), 0);
      const totalFilled = withCapacity.reduce((s, p) => s + ((p.capacity || 0) - (p.availableRooms || 0)), 0);
      const fillRate = totalCap > 0 ? totalFilled / totalCap : 0;
      occupancyScore += fillRate * 0.5;
    }
    occupancyScore = Math.min(occupancyScore, 1);
    const occupancyWeighted = occupancyScore * 20;
    const occupancyTip = withCapacity.length === 0 ? "Set capacity and available seats for your services" : occupancyScore < 0.5 ? "Low occupancy — consider adjusting pricing or adding amenities" : null;

    // 4. ENGAGEMENT SCORE (20%)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const propertyIds = properties.map((p) => p.id);

    const recentEvents = await prisma.engagementEvent.count({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const recentBookings = await prisma.booking.count({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    let engagementScore = 0;
    if (recentEvents > 0) engagementScore += 0.3;
    if (recentEvents >= 20) engagementScore += 0.2;
    if (recentEvents >= 50) engagementScore += 0.1;
    if (recentBookings > 0) engagementScore += 0.2;
    if (recentBookings >= 5) engagementScore += 0.2;
    engagementScore = Math.min(engagementScore, 1);
    const engagementWeighted = engagementScore * 20;
    const engagementTip = recentEvents === 0 ? "Share your service listings to increase visibility" : recentBookings === 0 ? "No bookings in the last 30 days — check pricing and availability" : null;

    // 5. RECENCY SCORE (15%)
    const now = new Date();
    const recentlyUpdated = properties.filter((p) => {
      const updatedAt = new Date(p.updatedAt);
      const daysSince = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 14;
    });
    const hasVerified = properties.some((p) => p.status === "VERIFIED");
    let recencyScore = 0;
    if (recentlyUpdated.length > 0) recencyScore += 0.4;
    if (recentlyUpdated.length === properties.length) recencyScore += 0.2;
    if (hasVerified) recencyScore += 0.4;
    recencyScore = Math.min(recencyScore, 1);
    const recencyWeighted = recencyScore * 15;
    const recencyTip = recentlyUpdated.length === 0 ? "Update your service details regularly to stay relevant" : !hasVerified ? "Get your services verified for better trust" : null;

    // Combine
    const totalScore = Math.round(photoWeighted + reviewWeighted + occupancyWeighted + engagementWeighted + recencyWeighted);

    const breakdown = [
      { label: "Photos", score: Math.round(photoScore * 100), weight: 25, weighted: Math.round(photoWeighted), icon: "camera" },
      { label: "Reviews", score: Math.round(reviewScore * 100), weight: 20, weighted: Math.round(reviewWeighted), icon: "star" },
      { label: "Occupancy", score: Math.round(occupancyScore * 100), weight: 20, weighted: Math.round(occupancyWeighted), icon: "users" },
      { label: "Engagement", score: Math.round(engagementScore * 100), weight: 20, weighted: Math.round(engagementWeighted), icon: "activity" },
      { label: "Recency", score: Math.round(recencyScore * 100), weight: 15, weighted: Math.round(recencyWeighted), icon: "clock" },
    ];

    const tips = [photoTip, reviewTip, occupancyTip, engagementTip, recencyTip].filter(Boolean);

    return NextResponse.json({ score: totalScore, breakdown, tips });
  } catch (error) {
    console.error("Health score error:", error);
    return NextResponse.json({ error: "Failed to compute health score" }, { status: 500 });
  }
}
