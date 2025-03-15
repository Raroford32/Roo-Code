import { Cline } from "./Cline";
import { ClineProvider } from "../webview/ClineProvider";
import { ApiConfiguration } from "../../shared/api";
import { ApiStreamChunk } from "../../api/transform/stream";
import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";

export async function initializeCline(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
  const provider = new ClineProvider(context, outputChannel);
  const apiConfig: ApiConfiguration = {
    apiProvider: "anthropic",
    apiModelId: "claude-3-5-sonnet-20241022",
    apiKey: "test-api-key",
  };

  const cline = new Cline({
    provider,
    apiConfiguration: apiConfig,
    customInstructions: "custom instructions",
    enableDiff: true,
    fuzzyMatchThreshold: 0.95,
    task: "test task",
  });

  return cline;
}

export async function handleTaskLifecycle(cline: Cline) {
  const task = cline.startTask();

  try {
    await task;
  } catch (error) {
    console.error("Task failed:", error);
  } finally {
    await cline.abortTask(true);
  }
}

export async function getEnvironmentDetails(cline: Cline) {
  const details = await cline.getEnvironmentDetails(false);
  return details;
}

export async function handleApiConversation(cline: Cline) {
  const conversationHistory: (Anthropic.MessageParam & { ts?: number })[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Here is an image",
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: "base64data",
          },
        },
      ],
    },
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I see the image",
        },
      ],
    },
  ];

  cline.apiConversationHistory = conversationHistory;

  const mockStream = (async function* () {
    yield { type: "text", text: "test response" };
  })();

  const apiResponse = await cline.api.createMessage({
    role: "user",
    content: [{ type: "text", text: "test request" }],
  });

  for await (const chunk of apiResponse) {
    console.log("API response chunk:", chunk);
  }
}

export async function handleApiRetry(cline: Cline) {
  const mockError = new Error("API Error");
  const mockFailedStream = {
    async *[Symbol.asyncIterator]() {
      throw mockError;
    },
  } as AsyncGenerator<ApiStreamChunk>;

  const mockSuccessStream = {
    async *[Symbol.asyncIterator]() {
      yield { type: "text", text: "Success" };
    },
  } as AsyncGenerator<ApiStreamChunk>;

  let firstAttempt = true;
  cline.api.createMessage = jest.fn().mockImplementation(() => {
    if (firstAttempt) {
      firstAttempt = false;
      return mockFailedStream;
    }
    return mockSuccessStream;
  });

  const iterator = cline.attemptApiRequest(0);
  await iterator.next();
}

export async function handleMentions(cline: Cline) {
  const userContent = [
    {
      type: "text",
      text: "Regular text with @/some/path",
    },
    {
      type: "text",
      text: "<task>Text with @/some/path in task tags</task>",
    },
    {
      type: "tool_result",
      tool_use_id: "test-id",
      content: [
        {
          type: "text",
          text: "<feedback>Check @/some/path</feedback>",
        },
      ],
    },
    {
      type: "tool_result",
      tool_use_id: "test-id-2",
      content: [
        {
          type: "text",
          text: "Regular tool result with @/path",
        },
      ],
    },
  ];

  const [processedContent] = await cline.loadContext(userContent);

  console.log("Processed content:", processedContent);
}
