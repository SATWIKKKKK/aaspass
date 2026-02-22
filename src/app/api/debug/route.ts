import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";
import { Resolver } from "dns";

// Temporary debug endpoint to check DB connectivity on Vercel
export async function GET() {
  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    timestamp: new Date().toISOString(),
  };

  // Test 0: DNS resolution
  const host = "db.ofcwfevliwkevpjaavun.supabase.co";
  try {
    const addr = await new Promise<string>((resolve, reject) => {
      dns.lookup(host, (err, address) => {
        if (err) reject(err);
        else resolve(address);
      });
    });
    info.dnsDefault = addr;
  } catch (e: any) {
    info.dnsDefaultError = e.message;
  }

  // Test: public DNS AAAA
  const pub = new Resolver();
  pub.setServers(["1.1.1.1", "8.8.8.8"]);
  try {
    const addrs = await new Promise<string[]>((resolve, reject) => {
      pub.resolve6(host, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    info.dnsPublicAAAA = addrs;
  } catch (e: any) {
    info.dnsPublicAAAAError = e.message;
  }

  // Test: public DNS A
  try {
    const addrs = await new Promise<string[]>((resolve, reject) => {
      pub.resolve4(host, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    info.dnsPublicA = addrs;
  } catch (e: any) {
    info.dnsPublicAError = e.message;
  }

  // Test 1: raw pg with custom lookup (same as prisma.ts)
  function robustLookup(
    hostname: string,
    _options: dns.LookupOptions,
    cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
  ) {
    dns.lookup(hostname, { all: false }, (sysErr, sysAddr, sysFam) => {
      if (!sysErr && sysAddr) return cb(null, sysAddr, sysFam);
      pub.resolve6(hostname, (err6, addrs6) => {
        if (!err6 && addrs6?.length) return cb(null, addrs6[0], 6);
        pub.resolve4(hostname, (err4, addrs4) => {
          if (!err4 && addrs4?.length) return cb(null, addrs4[0], 4);
          cb(sysErr ?? err4 ?? new Error(`DNS: cannot resolve ${hostname}`), "", 0);
        });
      });
    });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
    lookup: robustLookup,
  } as any);

  try {
    const res = await pool.query("SELECT count(*) as cnt FROM users");
    info.pgPoolWithLookupOk = true;
    info.pgPoolResult = res.rows;
  } catch (e: any) {
    info.pgPoolWithLookupOk = false;
    info.pgPoolWithLookupError = e.message;
  } finally {
    await pool.end();
  }

  // Test 2: Prisma singleton
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    info.prismaOk = true;
    info.userCount = userCount;
  } catch (e: any) {
    info.prismaOk = false;
    info.prismaError = e.message;
    info.prismaCode = e.code;
  }

  return NextResponse.json(info);
}
