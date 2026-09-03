/**
 * WebMCP compatibility layer.
 *
 * The API moved during the origin trial: `navigator.modelContext` shipped in
 * Chrome 146-149 and was deprecated in Chromium 150 in favour of
 * `document.modelContext`. Older builds also only had the batch
 * `provideContext({ tools })` form rather than incremental `registerTool`.
 *
 * Judges may open this on any of those, so we resolve the richest surface
 * available at runtime and normalise everything onto one internal shape.
 */

export interface ToolResultContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolResultContent[];
  /** Machine-readable payload; agents that support it get the raw numbers. */
  structuredContent?: unknown;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any) => Promise<ToolResult> | ToolResult;
}

interface ModelContextLike {
  registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => unknown;
  provideContext?: (context: { tools: unknown[] }) => unknown;
  addEventListener?: (type: string, listener: () => void) => void;
}

export type WebMcpFlavour = "document" | "navigator" | "provideContext" | "none";

interface Resolved {
  ctx: ModelContextLike | null;
  flavour: WebMcpFlavour;
}

function resolve(): Resolved {
  const doc = (document as unknown as { modelContext?: ModelContextLike }).modelContext;
  if (doc?.registerTool) return { ctx: doc, flavour: "document" };

  const nav = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext;
  if (nav?.registerTool) return { ctx: nav, flavour: "navigator" };

  const batch = doc ?? nav;
  if (batch?.provideContext) return { ctx: batch, flavour: "provideContext" };

  return { ctx: null, flavour: "none" };
}

/** Tools currently registered, kept so the legacy batch API can be re-sent. */
const live = new Map<string, ToolDefinition>();
let resolved: Resolved | null = null;

function ctx(): Resolved {
  if (!resolved) resolved = resolve();
  return resolved;
}

export function webmcpFlavour(): WebMcpFlavour {
  return ctx().flavour;
}

export function isWebMcpAvailable(): boolean {
  return ctx().flavour !== "none";
}

function toWireTool(tool: ToolDefinition) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: tool.execute,
  };
}

function resendBatch() {
  const { ctx: c } = ctx();
  c?.provideContext?.({ tools: [...live.values()].map(toWireTool) });
}

/**
 * Registers a tool and returns a disposer. Unregistration in the current spec
 * is driven by AbortSignal rather than an `unregisterTool` method, so each
 * tool gets its own controller.
 */
export function registerTool(tool: ToolDefinition): () => void {
  const { ctx: c, flavour } = ctx();
  live.set(tool.name, tool);

  if (!c) return () => live.delete(tool.name);

  if (flavour === "provideContext") {
    resendBatch();
    return () => {
      live.delete(tool.name);
      resendBatch();
    };
  }

  const controller = new AbortController();
  try {
    c.registerTool?.(toWireTool(tool), { signal: controller.signal });
  } catch {
    // Some builds reject the options bag; retry without it.
    try {
      c.registerTool?.(toWireTool(tool));
    } catch {
      /* tool simply will not be exposed on this build */
    }
  }
  return () => {
    live.delete(tool.name);
    controller.abort();
  };
}

export function onToolChange(listener: () => void) {
  ctx().ctx?.addEventListener?.("toolchange", listener);
}

export function registeredToolNames(): string[] {
  return [...live.keys()].sort();
}

/** Convenience for tool implementations: a text + structured result. */
export function ok(text: string, structured?: unknown): ToolResult {
  return {
    content: [{ type: "text", text }],
    ...(structured === undefined ? {} : { structuredContent: structured }),
  };
}

export function fail(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
