#version 300 es

precision highp float;

out vec2 v_pixel_position;

uniform mat4 u_projectionMatrix;

in vec2 a_position;
in vec2 a_pixel_position;

// Sets gl_Position to vec4
// Coordinates go from -1 to 1.
void main() {
  v_pixel_position = a_pixel_position;
  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
}
