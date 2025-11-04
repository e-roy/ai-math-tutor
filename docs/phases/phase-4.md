### Phase 4 — Progress Model (Detailed, Ages 4–18)

**Goal:** Flexible mastery tracking across grade bands.
**Tasks:**

* Add standards/skills/mastery/milestones tables and migrations.
  **Schema**

```ts
export const standards = pgTable("standards", {
  id: uuid("id").defaultRandom().primaryKey(),
  domain: text("domain").notNull(),        // Number Sense, Algebra, etc.
  code: text("code").notNull(),            // e.g., G6.EE.1
  gradeBand: text("grade_band").notNull(), // K–2, 3–5, 6–8, 9–12
  description: text("description"),
});

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  standardId: uuid("standard_id").notNull(),
  topic: text("topic").notNull(),
  subtopic: text("subtopic"),
  key: text("skill_key").notNull(), // slug
  description: text("description"),
});

export const mastery = pgTable("mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  skillId: uuid("skill_id").notNull(),
  level: integer("mastery_level").notNull().default(0), // 0-4
  evidence: jsonb("evidence_json").$type<any>().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  evidence: jsonb("evidence_json").$type<any>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Acceptance Criteria:**

* CRUD operations for these tables succeed.
* Foreign key relationships enforced (by app logic if not using FK).

