import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import dns from "dns";
import { Resolver } from "dns";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/* ---------- robust DNS lookup ----------
   Falls back to public DNS (Cloudflare / Google) when the
   system resolver cannot resolve a hostname – fixes campus /
   corporate networks that block or cannot resolve Supabase
   IPv6-only hostnames.                                        */

const publicDNS = new Resolver();
publicDNS.setServers(["1.1.1.1", "8.8.8.8"]);

function robustLookup(
  hostname: string,
  _options: dns.LookupOptions,
  cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
) {
  // 1. Try system DNS (fast path)
  dns.lookup(hostname, { all: false }, (sysErr, sysAddr, sysFam) => {
    if (!sysErr && sysAddr) return cb(null, sysAddr, sysFam);

    // 2. Fall back to public resolver – try AAAA first, then A
    publicDNS.resolve6(hostname, (err6, addrs6) => {
      if (!err6 && addrs6?.length) return cb(null, addrs6[0], 6);

      publicDNS.resolve4(hostname, (err4, addrs4) => {
        if (!err4 && addrs4?.length) return cb(null, addrs4[0], 4);

        // nothing worked – return original system error
        cb(sysErr ?? err4 ?? new Error(`DNS: cannot resolve ${hostname}`), "", 0);
      });
    });
  });
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === "production";

  const poolConfig: PoolConfig = {
    connectionString,
    max: 5,
    connectionTimeoutMillis: 15_000,
    // Short idle timeout – avoids campus firewalls killing idle connections
    idleTimeoutMillis: 10_000,
    // Proactively detect dead TCP connections
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    // Custom DNS to bypass broken campus / corporate resolvers
    lookup: robustLookup,
  } as any;

  if (isProduction) {
    poolConfig.ssl = { rejectUnauthorized: false };
  } else {
    poolConfig.ssl = false;
  }

  const pool = new Pool(poolConfig);

  // Silently handle pool errors to prevent process crash
  pool.on("error", (err) => {
    console.warn("[pg pool] background error (will reconnect):", err.message);
  });

  return pool;
}

function createPrismaClient() {
  // Reuse or create the pool
  const pool = globalForPrisma.pool ?? createPool();
  if (!globalForPrisma.pool) globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
