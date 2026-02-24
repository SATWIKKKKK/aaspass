import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find or create an owner user
  let owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) {
    const hash = await bcrypt.hash("owner123", 10);
    owner = await prisma.user.create({
      data: {
        name: "Demo Owner",
        email: "owner@demo.com",
        password: hash,
        role: "OWNER",
        phone: "9876543210",
      },
    });
    console.log("Created owner:", owner.email);
  } else {
    console.log("Using existing owner:", owner.email);
  }

  // 2. Demo properties with varied service types
  const properties = [
    {
      name: "Sunrise Boys Hostel",
      slug: "sunrise-boys-hostel",
      description:
        "A premium boys hostel near KIIT University with AC rooms, high-speed WiFi, and home-cooked meals. 24/7 security and power backup.",
      serviceType: "HOSTEL" as const,
      address: "Plot 42, Campus Road, Patia",
      city: "Bhubaneswar",
      state: "Odisha",
      pincode: "751024",
      latitude: 20.3543,
      longitude: 85.8145,
      nearbyLandmark: "500m from KIIT Gate 1",
      distanceMarket: "1.2 km",
      distanceInstitute: "0.5 km",
      price: 8500,
      gstRate: 18,
      isAC: true,
      hasWifi: true,
      forGender: "MALE" as const,
      occupancy: 3,
      foodIncluded: true,
      laundryIncluded: false,
      foodRating: 4.2,
      hasMedical: true,
      nearbyMess: "Annapurna Mess (200m)",
      nearbyLaundry: "QuickWash Laundry (300m)",
      cancellationPolicy:
        "Free cancellation up to 7 days before check-in. 50% refund for cancellations within 3-7 days.",
      rules:
        "No smoking. Visitors allowed till 9 PM. Quiet hours 10 PM - 6 AM.",
      avgRating: 4.3,
      totalReviews: 47,
    },
    {
      name: "Comfort PG for Girls",
      slug: "comfort-pg-for-girls",
      description:
        "Safe and comfortable PG accommodation exclusively for girls. Located in a prime area with easy access to colleges and markets.",
      serviceType: "PG" as const,
      address: "12/A, Saheed Nagar",
      city: "Bhubaneswar",
      state: "Odisha",
      pincode: "751007",
      latitude: 20.2891,
      longitude: 85.8454,
      nearbyLandmark: "Near Saheed Nagar Bus Stop",
      distanceMarket: "0.3 km",
      distanceInstitute: "2 km",
      price: 7000,
      gstRate: 18,
      isAC: false,
      hasWifi: true,
      forGender: "FEMALE" as const,
      occupancy: 2,
      foodIncluded: true,
      laundryIncluded: true,
      foodRating: 4.5,
      hasMedical: false,
      nearbyMess: null,
      nearbyLaundry: null,
      cancellationPolicy:
        "Full refund if cancelled 14 days before. No refund after that.",
      rules: "Gate closes at 9:30 PM. No male visitors beyond the reception.",
      avgRating: 4.6,
      totalReviews: 32,
    },
    {
      name: "StudyZone Library & Coworking",
      slug: "studyzone-library-coworking",
      description:
        "Air-conditioned library with individual desks, power outlets, and high-speed WiFi. Perfect for exam preparation and focused study sessions.",
      serviceType: "LIBRARY" as const,
      address: "3rd Floor, Tech Park, Chandrasekharpur",
      city: "Bhubaneswar",
      state: "Odisha",
      pincode: "751016",
      latitude: 20.3265,
      longitude: 85.819,
      nearbyLandmark: "Above Big Bazaar, Chandrasekharpur",
      distanceMarket: "0.1 km",
      distanceInstitute: "3 km",
      price: 1500,
      gstRate: 18,
      isAC: true,
      hasWifi: true,
      forGender: null,
      occupancy: 1,
      foodIncluded: false,
      laundryIncluded: false,
      foodRating: null,
      hasMedical: false,
      nearbyMess: "Multiple options within 100m",
      nearbyLaundry: null,
      cancellationPolicy:
        "Monthly subscription. Cancel anytime, valid till month end.",
      rules:
        "Maintain silence. No food inside the study area. Mobile phones on silent.",
      avgRating: 4.8,
      totalReviews: 89,
    },
    {
      name: "FitLife Gym & Wellness",
      slug: "fitlife-gym-wellness",
      description:
        "Fully equipped gym with cardio zone, weight training, crossfit area, and personal trainers. Separate batches for men and women.",
      serviceType: "GYM" as const,
      address: "Plot 78, Jaydev Vihar",
      city: "Bhubaneswar",
      state: "Odisha",
      pincode: "751013",
      latitude: 20.296,
      longitude: 85.82,
      nearbyLandmark: "Opposite Jaydev Vihar Square",
      distanceMarket: "0.5 km",
      distanceInstitute: "4 km",
      price: 2000,
      gstRate: 18,
      isAC: true,
      hasWifi: true,
      forGender: null,
      occupancy: null,
      foodIncluded: false,
      laundryIncluded: false,
      foodRating: null,
      hasMedical: true,
      nearbyMess: null,
      nearbyLaundry: null,
      cancellationPolicy:
        "No refund. Membership transferable with admin approval.",
      rules:
        "Carry your own towel. Wear proper gym shoes. No loud music without headphones.",
      avgRating: 4.1,
      totalReviews: 156,
    },
    {
      name: "HomePlate Mess",
      slug: "homeplate-mess",
      description:
        "Homestyle vegetarian and non-veg meals. Monthly subscription with breakfast, lunch, and dinner. Special weekend menus.",
      serviceType: "MESS" as const,
      address: "Lane 5, Patia Square",
      city: "Bhubaneswar",
      state: "Odisha",
      pincode: "751024",
      latitude: 20.351,
      longitude: 85.816,
      nearbyLandmark: "Behind Patia Big Bazaar",
      distanceMarket: "0.2 km",
      distanceInstitute: "1 km",
      price: 3500,
      gstRate: 5,
      isAC: false,
      hasWifi: false,
      forGender: null,
      occupancy: null,
      foodIncluded: true,
      laundryIncluded: false,
      foodRating: 4.7,
      hasMedical: false,
      nearbyMess: null,
      nearbyLaundry: null,
      cancellationPolicy:
        "Cancel before 25th of the month for next month. No mid-month cancellation.",
      rules:
        "Timings: Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7:30-9:30 PM. No takeaway.",
      avgRating: 4.4,
      totalReviews: 210,
    },
  ];

  // 3. Different demo images per property (Unsplash free images)
  const allImageSets = [
    [
      // Hostel — room/interior shots
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    ],
    [
      // PG — bedroom/living
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80",
    ],
    [
      // Library — books/study
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80",
    ],
    [
      // Gym — fitness
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
      "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80",
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80",
    ],
    [
      // Mess — food
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    ],
  ];

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const imgs = allImageSets[i];

    // Skip if slug already exists
    const exists = await prisma.property.findUnique({
      where: { slug: p.slug },
    });
    if (exists) {
      console.log(`Skipping "${p.name}" (already exists)`);
      continue;
    }

    const created = await prisma.property.create({
      data: {
        ...p,
        status: "VERIFIED",
        ownerId: owner.id,
        images: {
          create: imgs.map((url, idx) => ({
            url,
            isWideShot: idx === 0,
            order: idx,
          })),
        },
      },
    });
    console.log(
      `Created "${created.name}" (${created.serviceType}) - Rs.${created.price}/mo`
    );
  }

  console.log("\nDone! 5 demo properties seeded.\n");
  console.log("=== FILTER CHEAT SHEET ===");
  console.log("ALL properties        → /services");
  console.log("Hostels only          → /services?type=HOSTEL");
  console.log("PGs only              → /services?type=PG");
  console.log("Libraries             → /services?type=LIBRARY");
  console.log("Gyms                  → /services?type=GYM");
  console.log("Mess                  → /services?type=MESS");
  console.log("AC filter ON          → toggle AC in filter bar");
  console.log("WiFi filter ON        → toggle WiFi in filter bar");
  console.log("Male only             → Gender dropdown → Male");
  console.log("Female only           → Gender dropdown → Female");
  console.log("Price 0-5000          → Min=0, Max=5000 (Library, Gym, Mess)");
  console.log("Price 5000-10000      → Min=5000, Max=10000 (Hostel, PG)");
  console.log("Rating 4.5+           → Rating dropdown → 4.5+");
  console.log("Search 'Patia'        → /services?q=patia");
  console.log("From /home            → search on homepage → auto-redirects to /services with params");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
