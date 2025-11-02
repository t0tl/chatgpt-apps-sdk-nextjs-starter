import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  description: string;
  widgetDomain: string;
};

function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const handler = createMcpHandler(async (server) => {
  const html = await getAppsSdkCompatibleHtml(baseURL, "/");
  const abcHtml = await getAppsSdkCompatibleHtml(baseURL, "/abc");

  const contentWidget: ContentWidget = {
    id: "show_content",
    title: "Show Content",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading content...",
    invoked: "Content loaded",
    html: html,
    description: "Displays the homepage content",
    widgetDomain: "https://nextjs.org/docs",
  };

  const abcWidget: ContentWidget = {
    id: "retrieve_abc",
    title: "Retrieve ABC",
    templateUri: "ui://widget/abc-template.html",
    invoking: "Retrieving ABC data...",
    invoked: "ABC data retrieved",
    html: abcHtml,
    description: "Retrieves and displays ABC content",
    widgetDomain: "https://example.com/abc",
  };

  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": contentWidget.widgetDomain,
          },
        },
      ],
    })
  );

  server.registerResource(
    "abc-widget",
    abcWidget.templateUri,
    {
      title: abcWidget.title,
      description: abcWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": abcWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${abcWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": abcWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": abcWidget.widgetDomain,
          },
        },
      ],
    })
  );

  // use to register tools from MCP
  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Fetch and display the homepage content with the name of the user",
      inputSchema: {
        name: z.string().describe("The name of the user to display on the homepage"),
      },
      _meta: widgetMeta(contentWidget),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: name,
          },
        ],
        structuredContent: {
          name: name,
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(contentWidget),
      };
    }
  );

  server.registerTool(
    abcWidget.id,
    {
      title: abcWidget.title,
      description:
        "Retrieve and display ABC content with optional query parameter",
      inputSchema: {
        query: z.string().optional().describe("Optional query parameter for ABC retrieval"),
      },
      _meta: widgetMeta(abcWidget),
    },
    async ({ query }) => {
      return {
        content: [
          {
            type: "text",
            text: `ABC data retrieved${query ? ` with query: ${query}` : ''}`,
          },
        ],
        structuredContent: {
          query: query || null,
          data: "abc",
          timestamp: new Date().toISOString(),
        },
        _meta: widgetMeta(abcWidget),
      };
    }
  );
});

export const GET = handler;
export const POST = handler;
