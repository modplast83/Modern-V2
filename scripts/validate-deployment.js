#!/usr/bin/env node
/**
 * Deployment Validation Script
 * Validates all requirements for successful deployment
 */

import { constants } from "fs";
import { readdir, access } from "fs/promises";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function validateDeployment() {
  console.log("🔍 Validating deployment requirements...\n");

  let hasErrors = false;

  // 1. Check environment variables
  console.log("1. Environment Variables:");
  if (!process.env.DATABASE_URL) {
    console.error("   ❌ DATABASE_URL is not set");
    hasErrors = true;
  } else {
    console.log("   ✅ DATABASE_URL is configured");

    // Check format compatibility
    if (
      process.env.DATABASE_URL.includes("postgresql://") ||
      process.env.DATABASE_URL.includes("postgres://")
    ) {
      console.log("   ✅ Database URL format is compatible");
    } else {
      console.error(
        "   ❌ Database URL format may not be compatible with production",
      );
      hasErrors = true;
    }
  }

  // 2. Check migration files exist
  console.log("\n2. Migration Files:");
  try {
    await access("./migrations", constants.F_OK);
    const migrationFiles = await readdir("./migrations");
    const sqlFiles = migrationFiles.filter((f) => f.endsWith(".sql"));

    if (sqlFiles.length > 0) {
      console.log(`   ✅ Found ${sqlFiles.length} migration file(s)`);
      sqlFiles.forEach((file) => console.log(`      - ${file}`));
    } else {
      console.error("   ❌ No SQL migration files found");
      hasErrors = true;
    }
  } catch (error) {
    console.error("   ❌ Migrations directory not found");
    hasErrors = true;
  }

  // 3. Check database connection
  console.log("\n3. Database Connection:");
  if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle({ client: pool });

      // Test connection
      const result = await db.execute("SELECT NOW() as current_time");
      console.log("   ✅ Database connection successful");
      console.log(`   ✅ Database time: ${result.rows[0]?.current_time}`);

      await pool.end();
    } catch (error) {
      console.error("   ❌ Database connection failed:", error.message);
      hasErrors = true;
    }
  }

  // 4. Check schema files
  console.log("\n4. Schema Files:");
  try {
    await access("./shared/schema.ts", constants.F_OK);
    console.log("   ✅ Main schema file exists");
  } catch (error) {
    console.error("   ❌ Main schema file not found");
    hasErrors = true;
  }

  // 5. Check drizzle config
  console.log("\n5. Drizzle Configuration:");
  try {
    await access("./drizzle.config.ts", constants.F_OK);
    console.log("   ✅ Drizzle config file exists");
  } catch (error) {
    console.error("   ❌ Drizzle config file not found");
    hasErrors = true;
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.error("❌ DEPLOYMENT VALIDATION FAILED");
    console.error("Please fix the errors above before deploying.");
    process.exit(1);
  } else {
    console.log("✅ DEPLOYMENT VALIDATION PASSED");
    console.log("All requirements met. Ready for deployment!");
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateDeployment();
}

export { validateDeployment };
