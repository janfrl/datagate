import { devtoolsExpectedNitroTasks, devtoolsHighLevelTools } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(() => {
  assertDataGateDevtoolsEnabled()

  return {
    highLevelTools: devtoolsHighLevelTools,
    expectedNitroTasks: devtoolsExpectedNitroTasks.map(task => ({
      ...task,
      availability: {
        status: 'probe-required',
        message: 'Provide a dataset id in Diagnostics to verify whether Nitro can run this task in the current server process.'
      }
    }))
  }
})
