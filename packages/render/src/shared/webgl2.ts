export function createShader(
  gl: WebGL2RenderingContext,
  type:
    | WebGLRenderingContextBase['VERTEX_SHADER']
    | WebGLRenderingContextBase['FRAGMENT_SHADER'],
  source: string
): WebGLShader {
  // TODO: are all unneeded webgl objects properly deleted?

  const shader = gl.createShader(type)
  if (shader) {
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) {
      return shader
    } else {
      const message = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Failed to compile shader: ' + message)
    }
  } else {
    throw new Error('Failed to create shader')
  }
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  // TODO: are all unneeded webgl objects properly deleted?

  const program = gl.createProgram()
  if (program) {
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) {
      return program
    } else {
      const message = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error('Failed to link program: ' + message)
    }
  } else {
    throw new Error('Failed to create program')
  }
}

export function createBuffer(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  data: Float32Array,
  size: number,
  name: string
) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

  const type = gl.FLOAT
  const normalize = false
  const stride = 0
  const offset = 0

  const positionAttributeLocation = gl.getAttribLocation(program, name)
  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  )
  gl.enableVertexAttribArray(positionAttributeLocation)
}
