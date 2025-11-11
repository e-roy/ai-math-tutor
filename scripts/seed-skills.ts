import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env") });

// Define schema inline to avoid importing from src
// Note: Table names are prefixed with "ai-math-tutor_" in the database
const standards = pgTable("ai-math-tutor_standard", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull(),
  code: text("code").notNull(),
  gradeBand: text("grade_band").notNull(),
  description: text("description"),
});

const skills = pgTable("ai-math-tutor_skill", {
  id: uuid("id").defaultRandom().primaryKey(),
  standardId: uuid("standard_id").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),
  key: text("skill_key").notNull(),
  description: text("description"),
});

async function main() {
  console.log("Starting skills seeding...");
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create database connection
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  try {
    console.log("Creating standards...");
    
    // Insert standards
    const [arithmeticStd] = await db
      .insert(standards)
      .values({
        domain: "Number & Operations",
        code: "NBT",
        gradeBand: "K-5",
        description: "Basic arithmetic operations",
      })
      .returning();

    const [algebraStd] = await db
      .insert(standards)
      .values({
        domain: "Algebra",
        code: "EE",
        gradeBand: "6-8",
        description: "Expressions and equations",
      })
      .returning();

    const [geometryStd] = await db
      .insert(standards)
      .values({
        domain: "Geometry",
        code: "G",
        gradeBand: "6-8",
        description: "Geometric shapes and formulas",
      })
      .returning();

    if (!arithmeticStd || !algebraStd || !geometryStd) {
      throw new Error("Failed to create standards");
    }

    console.log("Creating skills...");

    // Insert skills
    await db.insert(skills).values([
      {
        standardId: arithmeticStd.id,
        topic: "Addition",
        key: "addition-basic",
        description: "Basic addition with single-digit numbers",
      },
      {
        standardId: arithmeticStd.id,
        topic: "Subtraction",
        key: "subtraction-basic",
        description: "Basic subtraction with single-digit numbers",
      },
      {
        standardId: algebraStd.id,
        topic: "Linear Equations",
        key: "linear-equations-one-step",
        description: "Solving one-step linear equations",
      },
      {
        standardId: algebraStd.id,
        topic: "Linear Equations",
        key: "linear-equations-two-step",
        description: "Solving two-step linear equations",
      },
      {
        standardId: geometryStd.id,
        topic: "Area",
        key: "area-rectangle",
        description: "Finding area of rectangles",
      },
      {
        standardId: geometryStd.id,
        topic: "Perimeter",
        key: "perimeter-basic",
        description: "Finding perimeter of basic shapes",
      },
    ]);

    console.log("✓ Skills seeded successfully!");
    console.log(`  - Created 3 standards`);
    console.log(`  - Created 6 skills`);
    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding skills:", error);
    process.exit(1);
  }
}

main();

