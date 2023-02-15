#version 300 es

precision highp float;

// TODO: use uniform block?
// uniform FrameState {
// };

uniform float[6] u_coordinateToPixelTransform;
uniform vec2 u_canvasSize;
uniform float u_devicePixelRatio;

in vec4 a_position;

// TODO: use mat2x3 instead of float[6]
vec2 apply(float[6] transform, vec4 coordinate) {
  float x = coordinate[0];
  float y = coordinate[1];

  return vec2(transform[0] * x + transform[2] * y + transform[4], transform[1] * x + transform[3] * y + transform[5]);
}

// Sets gl_Position to vec4
// Coordinates go from -1 to 1.
void main() {
  vec2 pixel = apply(u_coordinateToPixelTransform, a_position);
  vec2 canvasPixel = (pixel * u_devicePixelRatio / u_canvasSize - 0.5) * 2.0 * vec2(1.0, -1.0);
  gl_Position = vec4(canvasPixel, 0.0, 1.0);
}
