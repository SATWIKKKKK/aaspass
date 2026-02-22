import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";
import { Resolver } from "dns";
import net from "net";

// Temporary debug endpoint to check DB connectivity on Vercel
export async function GET() {
  const info: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  const dbUrl = new URL(process.env.DATABASE_URL!);
  const dbUser = decodeURIComponent(dbUrl.username);
  const dbPass = decodeURIComponent(dbUrl.password);
  const dbName = dbUrl.pathname.replace("/", "");

  // Resolve hostname to IPv6 via DNS
  const host = dbUrl.hostname;
  const pub = new Resolver();
  pub.setServers(["1.1.1.1", "8.8.8.8"]);

  let ipv6Addr = "";
  try {
    const addrs = await new Promise<string[]>((resolve, reject) => {
      pub.resolve6(host, (err, a) => (err ? reject(err) : resolve(a)));
    });
    ipv6Addr = addrs[0];
    info.resolvedIPv6 = ipv6Addr;
  } catch (e: any) {
    info.resolveError = e.message;
  }

  // Test 1: Raw TCP to IPv6 address on port 5432
  if (ipv6Addr) {
    try {
      await new Promise<void>((resolve, reject) => {
        const sock = net.connect({ host: ipv6Addr, port: 5432 });
        const timer = setTimeout(() => {
          sock.destroy();
          reject(new Error("tcp timeout 8s"));
        }, 8000);
        sock.on("connect", () => {
          clearTimeout(timer);
          sock.destroy();
          resolve();
        });
        sock.on("error", (e) => {
          clearTimeout(timer);
          sock.destroy();
          reject(e);
        });
      });
      info.ipv6TcpOk = true;
    } catch (e: any) {
      info.ipv6TcpOk = false;
      info.ipv6TcpError = e.message;
    }
  }

  // Test 2: pg Pool with resolved IPv6 address (bypass DNS)
  if (ipv6Addr && info.ipv6TcpOk) {
    const pool = new Pool({
      host: ipv6Addr,
      port: 5432,
      user: dbUser,
      password: dbPass,
      database: dbName,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10_000,
    });
    try {
      const res = await pool.query("SELECT count(*)::int as cnt FROM users");
      info.pgIpv6Ok = true;
      info.pgIpv6Result = res.rows;
    } catch (e: any) {
      info.pgIpv6Ok = false;
      info.pgIpv6Error = e.message;
    }
    await pool.end().catch(() => {});
  }

  // Test 3: Pooler (untested regions)
  const regions = [
    "ap-northeast-1",
    "ap-southeast-2",
    "us-west-2",
    "ap-northeast-2",
    "ca-central-1",
    "sa-east-1",
  ];
  const poolerResults: Record<string, string> = {};
  for (const r of regions) {
    const url = `postgresql://postgres.ofcwfevliwkevpjaavun:${dbPass}@aws-0-${r}.pooler.supabase.com:6543/postgres`;
    const p = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    try {
      await p.query("SELECT 1");
      poolerResults[r] = "OK";
    } catch (e: any) {
      poolerResults[r] = e.message.substring(0, 100);
    }
    await p.end().catch(() => {});
  }
  info.poolerResults = poolerResults;

  return NextResponse.json(info);
}
