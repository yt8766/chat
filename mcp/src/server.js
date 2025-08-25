// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { z } from "zod";
// import fs from "fs";
// import { readResourse } from "./utils/readResourse.js";

// const server = new McpServer({
//   name: "my mcp server",
//   title: "my mcp server",
//   version: "0.1.0",
// });

// server.registerResource(
//   "香蕉手机",
//   "bananaphone://info",
//   {
//     title: "香蕉手机信息",
//     description: "香蕉手机的产品以及特性的介绍文字",
//     mimeType: "text/plain",
//   },
//   async (uri) => {
//     const content = await readResourse("src/assets", "bananaphone.txt", false);
//     return {
//       contents: [
//         {
//           uri: uri.href,
//           name: "香蕉手机信息",
//           text: content,
//         },
//       ],
//     };
//   }
// );

// server.registerResource(
//   "书籍图片",
//   "pics://books",
//   {
//     title: "书籍图片",
//     description: "一张很多书籍的图片",
//     mimeType: "image/jpeg",
//   },
//   async (uri) => {
//     const content = await readResourse("src/assets", "books.jpeg", true);
//     return {
//       contents: [
//         {
//           uri: uri.href,
//           name: "书籍图片",
//           blob: content,
//         },
//       ],
//     };
//   }
// );

// server.registerTool(
//   "sum", // 函数名
//   {
//     title: "两数求和",
//     description: "得到两个数的和",
//     inputSchema: {
//       a: z.number().describe("第一个数"),
//       b: z.number().describe("第二个数"),
//     },
//   },
//   ({ a, b }) => {
//     // console.error(123);
//     return {
//       content: [
//         {
//           type: "text",
//           text: `两数求和结果：${a + b}`,
//         },
//       ],
//     };
//   }
// );

// server.registerTool(
//   "createFile",
//   {
//     title: "创建文件",
//     description: "在指定目录下创建一个文件",
//     inputSchema: {
//       filename: z.string().describe("文件名"),
//       content: z.string().describe("文件内容"),
//     },
//   },
//   ({ filename, content }) => {
//     try {
//       fs.writeFileSync(filename, content);
//       return {
//         content: [
//           {
//             type: "text",
//             text: `文件创建成功！`,
//           },
//         ],
//       };
//     } catch (err) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: err.message || "文件创建失败！",
//           },
//         ],
//       };
//     }
//   }
// );

// const transport = new StdioServerTransport();
// await server.connect(transport);

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readResourse } from "./utils/readResourse.js";

const server = new Server(
  {
    name: "resources-server",
    version: "0.0.1",
    description: "提供资源的MCP服务器",
  },
  {
    capabilities: {
      resources: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "bananaphone://info",
        name: "香蕉手机",
        description: "香蕉手机的产品以及特性的介绍文字",
        mimeType: "text/plain",
      },
      {
        uri: "image://books",
        name: "书籍图片",
        description: "一张很多书籍的图片",
        mimeType: "image/jpeg",
      },
    ],
  };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: "code://file/{filename}",
        name: "代码文件",
        description: "访问code目录下的JS文件的内容",
        mimeType: "text/javascript",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "bananaphone://info") {
    const content = await readResourse("src/assets", "bananaphone.txt", false);

    return {
      contents: [
        {
          uri: uri,
          mimeType: "text/plain",
          text: content,
        },
      ],
    };
  }

  if (uri === "image://books") {
    // 读取图片资源
    const base64Data = await readResourse("src/assets", "books.jpeg", true);

    return {
      contents: [
        {
          mimeType: "image/jpeg",
          text: base64Data,
          uri,
        },
      ],
    };
  }

  if (uri.startsWith("code://file/")) {
    const uriObj = new URL(uri);

    const filename = uriObj.pathname.split("/").pop();

    if (!filename || !filename.endsWith(".js")) {
      throw new Error("请指定一个有效的.js文件");
    }
    const content = await readResourse("src/code", filename, false);

    return {
      contents: [
        {
          uri,
          mimeType: "text/javascript",
          text: content,
        },
      ],
    };
  }

  throw new Error(`未知的资源URI: ${uri}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
