// Database integration
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
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
let db: any;

if (isRailway) {
  // Railway: Use regular PostgreSQL driver
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
} else {
  // Replit: Use Neon serverless driver
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };
