#version 300 es

precision highp float;

uniform mat4 u_projectionMatrix;

in vec2 a_position;

// Sets gl_Position to vec4
// Coordinates go from -1 to 1.
void main() {
  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
}
