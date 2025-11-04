import { relations } from "drizzle-orm";

// Re-export createTable from utils
export { createTable } from "./utils";

// Re-export all tables
export * from "./auth";
export * from "./conversations";
export * from "./files";
export * from "./boards";

// Import tables for relations (after exports to avoid circular deps)
import { users, accounts, sessions } from "./auth";
import { conversations, turns } from "./conversations";
import { files } from "./files";
import { boards, boardSnapshots } from "./boards";

// Define all relations in one place to avoid duplicate definitions
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  conversations: many(conversations),
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
