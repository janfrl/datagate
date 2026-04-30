import { devtoolsBuiltInWorkflows, devtoolsExpectedNitroTasks, devtoolsHighLevelTools } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled, isDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(() => {
  assertDataGateDevtoolsEnabled()

  return {
    enabled: isDataGateDevtoolsEnabled(),
    environment: process.env.NODE_ENV || 'development',
    tools: devtoolsHighLevelTools.length,
    workflows: devtoolsBuiltInWorkflows.length,
    expectedNitroTasks: devtoolsExpectedNitroTasks.length,
    privacy: {
      rawDatasetRowsExposed: false,
      storagePathsExposedByDefault: false,
      secretsExposed: false
    }
  }
})
