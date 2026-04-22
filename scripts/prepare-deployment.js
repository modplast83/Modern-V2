#!/usr/bin/env node
/**
 * Production Deployment Preparation Script
 * Ensures all database migrations and configurations are ready for production
 */

import { constants } from "fs";
import { readdir, access } from "fs/promises";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function prepareDeployment() {
  console.log("🚀 Preparing for deployment...\n");

  let hasErrors = false;

  // 1. Environment Variable Check
  console.log("1. 🔍 Checking environment variables...");
  if (!process.env.DATABASE_URL) {
    console.error("   ❌ DATABASE_URL is not set");
    hasErrors = true;
  } else {
    console.log("   ✅ DATABASE_URL is configured");

    // Validate URL format
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.protocol.includes("postgres")) {
        console.log("   ✅ Database URL format is valid");
      } else {
        console.error("   ❌ Invalid database URL protocol");
        hasErrors = true;
      }
    } catch (error) {
      console.error("   ❌ Invalid database URL format:", error.message);
      hasErrors = true;
    }
  }

  // 2. Migration Files Check
  console.log("\n2. 📁 Checking migration files...");
  try {
    await access("./migrations", constants.F_OK);
    const migrationFiles = await readdir("./migrations");
    const sqlFiles = migrationFiles.filter((f) => f.endsWith(".sql"));

    if (sqlFiles.length > 0) {
      console.log(`   ✅ Found ${sqlFiles.length} migration file(s)`);
      sqlFiles.forEach((file) => console.log(`      - ${file}`));
    } else {
      console.log("   ⚠️  No SQL migration files found - will use schema push");
    }
  } catch (error) {
    console.log(
      "   ⚠️  Migrations directory not found - will create during deployment",
    );
  }

  // 3. Database Connection Test
  console.log("\n3. 🔌 Testing database connection...");
  if (!process.env.DATABASE_URL) {
    console.error("   ❌ Cannot test connection - DATABASE_URL not set");
    hasErrors = true;
  } else {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle({ client: pool });

      // Test basic connection
      const result = await db.execute(
        "SELECT NOW() as current_time, version() as db_version",
      );
      const { current_time, db_version } = result.rows[0];
      console.log("   ✅ Database connection successful");
      console.log(`   ✅ Database time: ${current_time}`);
      console.log(`   ✅ Database version: ${db_version.split(" ")[0]}`);

      // Test schema existence
      try {
        const tableCheck = await db.execute(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        const tables = tableCheck.rows.map((row) => row.table_name);
        if (tables.length > 0) {
          console.log(`   ✅ Found ${tables.length} existing tables`);
          console.log(
            "      - Tables: " +
              tables.slice(0, 5).join(", ") +
              (tables.length > 5 ? "..." : ""),
          );
        } else {
          console.log("   ⚠️  No tables found - fresh database detected");
        }
      } catch (schemaError) {
        console.log("   ⚠️  Could not check schema - may be a new database");
      }

      await pool.end();
    } catch (error) {
      console.error("   ❌ Database connection failed:", error.message);
      hasErrors = true;
    }
  }

  // 4. Schema Files Check
  console.log("\n4. 📄 Checking schema files...");
  const schemaFiles = ["./shared/schema.ts"];
  for (const file of schemaFiles) {
    try {
      await access(file, constants.F_OK);
      console.log(`   ✅ ${file.split("/").pop()} exists`);
    } catch (error) {
      console.error(`   ❌ ${file.split("/").pop()} not found`);
      hasErrors = true;
    }
  }

  // 5. Dependencies Check
  console.log("\n5. 📦 Checking dependencies...");
  try {
    await access("./package.json", constants.F_OK);
    console.log("   ✅ package.json exists");

    // Import package.json to check dependencies
    const { readFile } = await import("fs/promises");
    const packageData = JSON.parse(await readFile("./package.json", "utf-8"));

    const requiredDeps = [
      "@neondatabase/serverless",
      "drizzle-orm",
      "drizzle-kit",
      "express",
      "ws",
    ];

    const missingDeps = requiredDeps.filter(
      (dep) =>
        !packageData.dependencies[dep] && !packageData.devDependencies[dep],
    );

    if (missingDeps.length === 0) {
      console.log("   ✅ All required dependencies are installed");
    } else {
      console.error("   ❌ Missing dependencies:", missingDeps.join(", "));
      hasErrors = true;
    }
  } catch (error) {
    console.error("   ❌ Could not read package.json:", error.message);
    hasErrors = true;
  }

  // 6. Build Configuration Check
  console.log("\n6. ⚙️  Checking build configuration...");
  try {
    await access("./vite.config.ts", constants.F_OK);
    console.log("   ✅ Vite configuration exists");
  } catch (error) {
    console.error("   ❌ Vite configuration not found");
    hasErrors = true;
  }

  try {
    await access("./drizzle.config.ts", constants.F_OK);
    console.log("   ✅ Drizzle configuration exists");
  } catch (error) {
    console.error("   ❌ Drizzle configuration not found");
    hasErrors = true;
  }

  // Final Result
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.error("❌ DEPLOYMENT PREPARATION FAILED");
    console.error("Please fix the above issues before deploying.");
    process.exit(1);
  } else {
    console.log("✅ DEPLOYMENT PREPARATION SUCCESSFUL");
    console.log("All systems ready for deployment!");
    console.log("\nNext steps:");
    console.log(
      "1. Ensure all environment variables are set in Replit Deployments",
    );
    console.log("2. Set DATABASE_URL in the Deployments environment variables");
    console.log("3. Click Deploy to start the deployment process");
  }
}

// Export for use in other scripts
export { prepareDeployment };

// Run preparation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prepareDeployment().catch((error) => {
    console.error("❌ Deployment preparation failed:", error);
    process.exit(1);
  });
}
