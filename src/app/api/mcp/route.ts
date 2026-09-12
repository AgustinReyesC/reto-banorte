import { createMcpHandler } from "mcp-handler";
import { MCP_TOOLS } from "@/mcp/tools";

/**
 * Servidor MCP real: expone src/mcp/tools/index.ts por el protocolo,
 * en vez de que el agente importe las funciones directamente.
 */
const handler = createMcpHandler((server) => {
  for (const [name, tool] of Object.entries(MCP_TOOLS)) {
    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        const result = await tool.handler(args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          structuredContent: result as Record<string, unknown>,
        };
      }
    );
  }
});

export { handler as GET, handler as POST };
