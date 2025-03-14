import { CheckpointServiceOptions, RepoPerTaskCheckpointService, RepoPerWorkspaceCheckpointService } from "../../services/checkpoints"

export async function initializeCheckpointService(options: CheckpointServiceOptions) {
  const { checkpointStorage } = options

  if (checkpointStorage === "task") {
    return RepoPerTaskCheckpointService.create(options)
  } else if (checkpointStorage === "workspace") {
    return RepoPerWorkspaceCheckpointService.create(options)
  } else {
    throw new Error(`Unsupported checkpoint storage: ${checkpointStorage}`)
  }
}
