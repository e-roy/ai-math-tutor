import { db } from "./index";
import { standards, skills } from "./schema";

export async function seedSkills() {
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

  console.log("Skills seeded successfully");
}

