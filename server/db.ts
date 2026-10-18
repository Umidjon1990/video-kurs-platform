// Database integration
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use regular pg for Railway, Neon serverless for Replit
const isRailway = !process.env.REPLIT_DOMAINS;

let pool: any;
let db: NodePgDatabase<typeof schema>;

if (isRailway) {
  // Railway: Use regular PostgreSQL driver
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL,max:Math.max(1,Math.min(30,Number(process.env.DB_POOL_MAX)||10)) });
  db = drizzlePg(pool, { schema });
} else {
  // Replit: Use Neon serverless driver
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Both drivers expose the PostgreSQL query API used by storage.
  db = drizzleNeon({ client: pool, schema }) as unknown as NodePgDatabase<typeof schema>;
}

export { pool, db };
