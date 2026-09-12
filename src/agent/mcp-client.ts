import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

/**
 * El agente habla con nuestras 6 tools a través del protocolo MCP real
 * (HTTP contra /api/mcp), no importándolas directo desde src/mcp/.
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:3000/api/mcp";

async function connect(): Promise<Client> {
  const client = new Client({ name: "reto-banorte-agent", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
  await client.connect(transport);
  return client;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export async function listMcpTools(): Promise<McpToolDefinition[]> {
  const client = await connect();
  try {
    const { tools } = await client.listTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));
  } finally {
    await client.close();
  }
}

export interface McpToolCallResult {
  isError: boolean;
  structuredContent?: Record<string, unknown>;
  text: string;
}

export async function callMcpTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
  const client = await connect();
  try {
    const result = await client.callTool({ name, arguments: args });
    const textBlock = result.content?.find(
      (block): block is { type: "text"; text: string } => block.type === "text"
    );
    return {
      isError: Boolean(result.isError),
      structuredContent: result.structuredContent as Record<string, unknown> | undefined,
      text: textBlock?.text ?? "",
    };
  } finally {
    await client.close();
  }
}
