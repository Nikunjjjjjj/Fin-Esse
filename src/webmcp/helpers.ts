import { logActivity } from "../store/store";
import { ok, type ToolDefinition, type ToolResult } from "./shim";

export type Schema = Record<string, unknown>;

export const S = {
  obj(properties: Record<string, Schema>, required: string[] = []): Schema {
    return { type: "object", properties, required, additionalProperties: false };
  },
  num(description: string, extra: Schema = {}): Schema {
    return { type: "number", description, ...extra };
  },
  str(description: string, extra: Schema = {}): Schema {
    return { type: "string", description, ...extra };
  },
  bool(description: string, extra: Schema = {}): Schema {
    return { type: "boolean", description, ...extra };
  },
  enumOf(values: readonly string[], description: string): Schema {
    return { type: "string", enum: [...values], description };
  },
  arr(items: Schema, description: string): Schema {
    return { type: "array", items, description };
  },
};

export interface ToolSpec extends Omit<ToolDefinition, "execute"> {
  /** Marks tools that read state vs. mutate it vs. queue a proposal for a human. */
  effect: "read" | "write" | "propose";
  execute: (input: any) => Promise<ToolResult> | ToolResult;
  /** Entity ids to flash in the UI, derived from the input. */
  touches?: (input: any) => string[];
}

/**
 * Wraps a tool so that every agent call is recorded on the visible activity
 * trail and flashes the UI cards it touched. This is what lets a human watch
 * an agent work rather than just receive its conclusion.
 */
export function instrument(spec: ToolSpec): ToolDefinition {
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    execute: async (input: any) => {
      const touched = spec.touches?.(input ?? {}) ?? [];
      try {
        const result = await spec.execute(input ?? {});
        logActivity(
          spec.effect === "propose" ? "propose" : spec.effect === "write" ? "write" : "read",
          spec.name,
          summarise(input),
          touched,
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logActivity("system", spec.name, `failed: ${message}`, touched);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  };
}

function summarise(input: unknown): string {
  if (!input || typeof input !== "object") return "called";
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .slice(0, 4)
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v)}`);
  return entries.length ? entries.join(", ") : "called";
}

/** Standard success shape: a readable line for the agent plus the raw numbers. */
export function result(text: string, data?: unknown): ToolResult {
  return ok(text, data);
}

export function requireNumber(value: unknown, field: string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new Error(`"${field}" must be a finite number.`);
  }
  return n;
}
