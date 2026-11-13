let webglSupport: boolean | null = null

export function supportsWebGL(): boolean {
  if (webglSupport === null) {
    const context = document.createElement('canvas').getContext('webgl2')
    webglSupport = context !== null
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return webglSupport
}
