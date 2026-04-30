export function isDataGateDevtoolsEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.NUXT_ENABLE_DEVTOOLS === 'true'
}

export function assertDataGateDevtoolsEnabled() {
  if (!isDataGateDevtoolsEnabled()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data Gate DevTools are disabled'
    })
  }
}
