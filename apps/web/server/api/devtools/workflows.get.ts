import { devtoolsBuiltInWorkflows } from '../../utils/devtoolsRegistry'
import { assertDataGateDevtoolsEnabled } from '../../utils/devtoolsAccess'

export default defineEventHandler(() => {
  assertDataGateDevtoolsEnabled()

  return {
    workflows: devtoolsBuiltInWorkflows
  }
})
