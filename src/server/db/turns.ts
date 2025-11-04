import { eq, asc } from "drizzle-orm";
import type { db } from "./index";
import { turns } from "./conversations";

type Database = typeof db;

export type TurnRole = "user" | "assistant";

export interface CreateTurnParams {
  conversationId: string;
  role: TurnRole;
  text?: string | null;
  latex?: string | null;
  tool?: unknown;
}

export interface Turn {
  id: string;
  conversationId: string;
  role: TurnRole;
  text: string | null;
  latex: string | null;
  tool: unknown | null;
  createdAt: Date;
}

/**
 * Create a new turn in the database
 */
export async function createTurn(
  db: Database,
  params: CreateTurnParams,
): Promise<Turn> {
  const [turn] = await db
    .insert(turns)
    .values({
      conversationId: params.conversationId,
      role: params.role,
      text: params.text ?? null,
      latex: params.latex ?? null,
      tool: params.tool ?? null,
    })
    .returning();

  if (!turn) {
    throw new Error("Failed to create turn");
  }

  return {
    id: turn.id,
    conversationId: turn.conversationId,
    role: turn.role as TurnRole,
    text: turn.text,
    latex: turn.latex,
    tool: turn.tool,
    createdAt: turn.createdAt,
  };
}

/**
 * Get all turns for a conversation, ordered by creation time
 */
export async function getTurnsByConversation(
  db: Database,
  conversationId: string,
): Promise<Turn[]> {
  const results = await db
    .select()
    .from(turns)
    .where(eq(turns.conversationId, conversationId))
    .orderBy(asc(turns.createdAt));

  return results.map((turn) => ({
    id: turn.id,
    conversationId: turn.conversationId,
    role: turn.role as TurnRole,
    text: turn.text,
    latex: turn.latex,
    tool: turn.tool,
    createdAt: turn.createdAt,
  }));
}

