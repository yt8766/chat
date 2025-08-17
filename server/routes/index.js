const express = require("express");
const router = express.Router();
const { getWeather } = require("../utils/wetherHandler.js");
const { translate } = require("../utils/translateHandler.js");
const { callLLM, callLLMStream } = require("../utils/LLM.js");
const {
  buildFunctionCallPrompt,
  buildAnswerPrompt,
} = require("../utils/promptTemplates.js");
const toolList = require("../utils/tools.js");

// 工具列表
const toolMap = {
  getWeather,
  translate,
};
// 创建一个数组，用于存储对话
const conversations = [];

// 注意，需要是一个post请求
router.post("/ask", async (req, res) => {
  const question = req.body.question || "";

  // const prompt = `

  // 用户的问题是：${question}
  // `;
  // const prompt = [
  //   "你是一个中文智能助手，请用中文回答用户的问题。",
  //   "你是一个专业的编程助手，擅长回答关于编程和技术相关的问题。",
  //   ...conversations.map((conversation) => {
  //     return `${conversation.role === "user" ? "用户" : "助手"}：${
  //       conversation.content
  //     }`;
  //   }),
  //   `用户的问题：${question}`,
  // ].join("\n");

  // const response = await fetch("http://localhost:11434/api/generate", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     model: "llama3",
  //     stream: true,
  //     prompt,
  //   }),
  // });
  // const result = await response.json();
  // res.json({
  //   answer: result.response || "抱歉，我无法回答这个问题。",
  // });
  res.setHeader("Content-Type", "text/event-stream");
  // 设置缓存控制头，防止浏览器缓存
  res.setHeader("Cache-Control", "no-cache");
  // const reader = response.body.getReader();
  // const decoder = new TextDecoder("utf-8");
  // let fullResponse = "";
  // while (true) {
  //   const { done, value } = await reader.read();
  //   if (done) break;
  //   const chunk = decoder.decode(value, { stream: true });
  //   const lines = chunk.split("\n").filter((line) => line.trim());

  //   for (const line of lines) {
  //     try {
  //       const data = JSON.parse(line);
  //       if (data.response) {
  //         fullResponse += data.response;
  //         res.write(`${JSON.stringify({ response: data.response })}\n`);
  //       }
  //     } catch (e) {
  //       console.log("JSON 解析错误:", e.message);
  //     }
  //   }
  // }

  // // 将完整的响应存储到对话中
  // conversations.push(
  //   {
  //     role: "user",
  //     content: question,
  //   },
  //   {
  //     role: "assistant",
  //     content: fullResponse,
  //   }
  // );

  // if (conversations.length > 20)
  //   conversations.splice(0, conversations.length - 20); // 保持对话长度不超过20条

  // res.end();
  // const functionCallPrompt = buildFunctionCallPrompt(question);
  const messages = [...conversations, { role: "user", content: question }];

  try {
    const response = await callLLM(messages, toolList, (chunk) => {
      res.write(`${JSON.stringify({ response: chunk })}\n`);
    });

    if (response.tool_calls) {
      const toolResults = [];

      for (const toolCall of response.tool_calls) {
        try {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          if (toolMap[functionName]) {
            const result = await toolMap[functionName](args);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: result,
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: `未找到对应的工具${functionName}`,
            });
          }
        } catch (error) {
          console.error("调用工具失败:", error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: `调用工具失败：${error.message}`,
          });
        }
      }

      messages.push(
        {
          role: "assistant",
          content: response.content,
          tool_calls: response.tool_calls,
        },
        ...toolResults
      );

      const finalResponse = await callLLM(messages, toolList, (chunk) => {
        res.write(`${JSON.stringify({ response: chunk })}\n`);
      });

      conversations.push(
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content: response.content,
          tool_calls: response.tool_calls,
        },
        ...toolResults,
        {
          role: "assistant",
          content: finalResponse,
        }
      );
    } else {
      conversations.push(
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content: response,
        }
      );
      res.write(`${JSON.stringify({ response })}\n`);
    }

    if (conversations.length > 20) {
      conversations.splice(0, conversations.length - 20); // 保持对话长度不超过20条
    }
  } catch (error) {
    console.error("LLM 调用失败:", error);
  }

  // let finalResponse = "";

  // if (functionCallResponse.trim() === "无函数调用") {
  //   // 如果不需要调用函数，直接返回回答
  //   const prompt = [
  //     ...conversations.map((conversation) => {
  //       return `${conversation.role === "user" ? "用户" : "助手"}：${
  //         conversation.content
  //       }`;
  //     }),
  //     {
  //       role: "user",
  //       content: question,
  //     },
  //   ];

  //   finalResponse = await callLLMStream(prompt, (chunk) => {
  //     res.write(`${JSON.stringify({ response: chunk })}\n`);
  //   });
  // } else {
  //   try {
  //     const toolCalls = JSON.parse(functionCallResponse);

  //     const tollResults = [];
  //     for (const tool of toolCalls) {
  //       const { function: functionName, args } = tool;
  //       if (toolMap[functionName]) {
  //         try {
  //           const result = await toolMap[functionName](args);
  //           tollResults.push({
  //             function: functionName,
  //             args,
  //             result,
  //           });
  //         } catch (error) {
  //           console.error(`调用 ${functionName} 失败:`, error.message);
  //           tollResults.push({
  //             function: functionName,
  //             args,
  //             result: `调用失败：${error.message}`,
  //           });
  //         }
  //       } else {
  //         console.log(`${functionName} 工具不存在`);
  //         tollResults.push({
  //           function: functionName,
  //           args,
  //           result: `工具不存在`,
  //         });
  //       }
  //     }
  //     const answerPrompt = buildAnswerPrompt(question, tollResults);
  //     const prompt = [
  //       ...conversations,
  //       { role: "user", content: answerPrompt },
  //     ];
  //     finalResponse = await callLLMStream(prompt, (chunk) => {
  //       res.write(`${JSON.stringify({ response: chunk })}\n`);
  //     });
  //   } catch (error) {
  //     console.error("函数调用解析失败:", error);
  //   }
  // }

  // conversations.push(
  //   {
  //     role: "user",
  //     content: question,
  //   },
  //   {
  //     role: "assistant",
  //     content: finalResponse,
  //   }
  // );

  res.end();
});

router.get("/history", (req, res) => {
  // 返回最近的对话记录
  res.json(conversations); // 返回最近的20条对话
});

router.get("/clear", (req, res) => {
  conversations.length = 0; // 清空对话记录
  res.json({ message: "对话记录已清空" });
});

module.exports = router;
