#!/usr/bin/env node
/**
 * Production-Safe Migration Script
 * Safely applies database migrations for production deployment
 */

import { constants } from "fs";
import { readdir, access } from "fs/promises";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function runProductionMigration() {
  console.log("🚀 Starting production-safe migration...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.error(
      "Please ensure DATABASE_URL is configured in your deployment environment",
    );
    process.exit(1);
  }

  console.log("✅ DATABASE_URL is configured");

  try {
    // Create database connection with production-safe settings
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20,
    });
    const db = drizzle({ client: pool });

    console.log("🔌 Connected to production database");

    // Check if migrations directory exists
    let migrationsExist = false;
    try {
      await access("./migrations", constants.F_OK);
      const migrationFiles = await readdir("./migrations");
      const sqlFiles = migrationFiles.filter((f) => f.endsWith(".sql"));
      migrationsExist = sqlFiles.length > 0;

      if (migrationsExist) {
        console.log(`📁 Found ${sqlFiles.length} migration file(s)`);
      }
    } catch (error) {
      console.log("📁 No migrations directory found");
    }

    if (migrationsExist) {
      // Run existing migrations
      console.log("🔄 Applying migrations...");
      await migrate(db, { migrationsFolder: "./migrations" });
      console.log("✅ Migrations applied successfully");
    } else {
      // No migrations found - this is a fresh database
      console.log(
        "🆕 Fresh database detected - migrations will be handled by schema push",
      );
      console.log("✅ Database is ready for schema initialization");
    }

    // Verify database structure
    console.log("🔍 Verifying database structure...");
    const tableCheck = await db.execute(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tables = tableCheck.rows.map((row) => row.table_name);
    console.log(`✅ Database has ${tables.length} table(s)`);

    if (tables.length > 0) {
      console.log(
        "📋 Tables: " +
          tables.slice(0, 10).join(", ") +
          (tables.length > 10 ? "..." : ""),
      );
    }

    // Close the connection
    await pool.end();
    console.log("🔚 Database connection closed");
    console.log("✅ Production migration completed successfully");
  } catch (error) {
    console.error("❌ Production migration failed:", error.message);
    console.error("Stack trace:", error.stack);

    // Provide helpful error messages for common issues
    if (error.message.includes("connect ECONNREFUSED")) {
      console.error(
        "\n💡 Connection refused - check if DATABASE_URL is correct and database is accessible",
      );
    } else if (error.message.includes("password authentication failed")) {
      console.error(
        "\n💡 Authentication failed - verify DATABASE_URL credentials",
      );
    } else if (error.message.includes("timeout")) {
      console.error(
        "\n💡 Connection timeout - database may be overloaded or network issues",
      );
    } else if (error.message.includes("migration")) {
      console.error(
        "\n💡 Migration error - check migration files for syntax errors",
      );
    }

    process.exit(1);
  }
}

// Export for use in other scripts
export { runProductionMigration };

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionMigration().catch((error) => {
    console.error("❌ Production migration script failed:", error);
    process.exit(1);
  });
}
