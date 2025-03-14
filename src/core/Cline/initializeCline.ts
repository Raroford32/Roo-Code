import { Cline } from "./Cline";
import { ClineProvider } from "../webview/ClineProvider";
import { ConfigManager } from "../config/ConfigManager";
import { CustomModesManager } from "../config/CustomModesManager";
import { ContextProxy } from "../contextProxy";
import WorkspaceTracker from "../../integrations/workspace/WorkspaceTracker";
import { McpServerManager } from "../../services/mcp/McpServerManager";
import { telemetryService } from "../../services/telemetry/TelemetryService";

export async function initializeCline(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
  const provider = new ClineProvider(context, outputChannel);
  telemetryService.setProvider(provider);

  const contextProxy = new ContextProxy(context);
  const configManager = new ConfigManager(context);
  const customModesManager = new CustomModesManager(context, async () => {
    await provider.postStateToWebview();
  });

  const workspaceTracker = new WorkspaceTracker(provider);

  // Initialize MCP Hub through the singleton manager
  McpServerManager.getInstance(context, provider)
    .then((hub) => {
      provider.mcpHub = hub;
    })
    .catch((error) => {
      outputChannel.appendLine(`Failed to initialize MCP Hub: ${error}`);
    });

  return {
    provider,
    contextProxy,
    configManager,
    customModesManager,
    workspaceTracker,
  };
}
