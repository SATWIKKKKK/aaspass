import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dns from "dns";
import { Resolver } from "dns";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const publicDNS = new Resolver();
publicDNS.setServers(["1.1.1.1", "8.8.8.8"]);

function robustLookup(hostname, _options, cb) {
  dns.lookup(hostname, { all: false }, (sysErr, sysAddr, sysFam) => {
    if (!sysErr && sysAddr) return cb(null, sysAddr, sysFam);
    publicDNS.resolve6(hostname, (err6, addrs6) => {
      if (!err6 && addrs6?.length) return cb(null, addrs6[0], 6);
      publicDNS.resolve4(hostname, (err4, addrs4) => {
        if (!err4 && addrs4?.length) return cb(null, addrs4[0], 4);
        cb(sysErr ?? err4 ?? new Error(`DNS: cannot resolve ${hostname}`), "", 0);
      });
    });
  });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:uoLNBMKrgWakH0kd@db.ofcwfevliwkevpjaavun.supabase.co:5432/postgres",
  ssl: false,
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  lookup: robustLookup,
});

// Test pool directly first
try {
  const res = await pool.query("SELECT count(*) FROM properties");
  console.log("Pool direct query OK:", res.rows);
  
  // Check table structure
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'properties' 
    ORDER BY ordinal_position
  `);
  console.log("Property columns:", cols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));
  
  // Check if enums exist
  const enums = await pool.query(`
    SELECT t.typname, e.enumlabel 
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `);
  console.log("Enums:", enums.rows.map(e => `${e.typname}.${e.enumlabel}`).join(', '));
  
  // Test a raw select on properties table
  const rawProp = await pool.query("SELECT * FROM properties LIMIT 1");
  console.log("Raw select OK, rows:", rawProp.rows.length);
  
} catch (e) {
  console.error("Pool direct query FAIL:", e.message);
}

// Now test via Prisma adapter  
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['query', 'error'] });

try {
  console.log("1. Sequential: count then findMany...");
  const count = await prisma.property.count();
  console.log("   count:", count);
  const props = await prisma.property.findMany({ take: 5 });
  console.log("   findMany:", props.length);

  console.log("2. Parallel: Promise.all([findMany, count])...");
  const [p2, c2] = await Promise.all([
    prisma.property.findMany({ where: { status: "VERIFIED" }, take: 12 }),
    prisma.property.count({ where: { status: "VERIFIED" } }),
  ]);
  console.log("   findMany:", p2.length, "count:", c2);

  console.log("3. Parallel with include...");
  const [p3, c3] = await Promise.all([
    prisma.property.findMany({
      where: { status: "VERIFIED" },
      orderBy: { avgRating: "desc" },
      skip: 0,
      take: 12,
      include: {
        images: { take: 1 },
        owner: { select: { name: true } },
      },
    }),
    prisma.property.count({ where: { status: "VERIFIED" } }),
  ]);
  console.log("   findMany+include:", p3.length, "count:", c3);

  console.log("All passed!");
} catch (e) {
  console.error("Prisma ERROR:", e.message);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
