import { relations } from "drizzle-orm";

// Re-export createTable from utils
export { createTable } from "./utils";

// Re-export all tables
export * from "./auth";
export * from "./conversations";
export * from "./files";
export * from "./boards";
export * from "./progress";
export * from "./practice";

// Import tables for relations (after exports to avoid circular deps)
import { users, accounts, sessions } from "./auth";
import { conversations, turns } from "./conversations";
import { files } from "./files";
import { boards, boardSnapshots } from "./boards";
import { standards, skills, mastery, milestones } from "./progress";
import { practiceSessions } from "./practice";

// Define all relations in one place to avoid duplicate definitions
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  conversations: many(conversations),
  mastery: many(mastery),
  milestones: many(milestones),
  practiceSessions: many(practiceSessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    turns: many(turns),
    files: many(files),
    boards: many(boards),
    practiceSessions: many(practiceSessions),
  }),
);

export const turnsRelations = relations(turns, ({ one }) => ({
  conversation: one(conversations, {
    fields: [turns.conversationId],
    references: [conversations.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  conversation: one(conversations, {
    fields: [files.conversationId],
    references: [conversations.id],
  }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [boards.conversationId],
    references: [conversations.id],
  }),
  snapshots: many(boardSnapshots),
}));

export const boardSnapshotsRelations = relations(boardSnapshots, ({ one }) => ({
  board: one(boards, {
    fields: [boardSnapshots.boardId],
    references: [boards.id],
  }),
}));

export const standardsRelations = relations(standards, ({ many }) => ({
  skills: many(skills),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
  standard: one(standards, {
    fields: [skills.standardId],
    references: [standards.id],
  }),
  mastery: many(mastery),
}));

export const masteryRelations = relations(mastery, ({ one }) => ({
  user: one(users, {
    fields: [mastery.userId],
    references: [users.id],
  }),
  skill: one(skills, {
    fields: [mastery.skillId],
    references: [skills.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  user: one(users, {
    fields: [milestones.userId],
    references: [users.id],
  }),
}));

export const practiceSessionsRelations = relations(
  practiceSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [practiceSessions.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [practiceSessions.conversationId],
      references: [conversations.id],
    }),
  }),
);
