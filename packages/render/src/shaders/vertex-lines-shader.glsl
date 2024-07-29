#version 300 es

precision highp float;

uniform mat4 u_renderTransform;

in vec2 a_sixClipPoint;
in vec2 a_sixNormal;

void main() {
  float lineWidth = 0.01;

  vec4 delta = vec4(a_sixNormal * lineWidth, 0.0, 1.0);
  // gl_Position = u_renderTransform * (vec4(a_sixClipPoint, 0.0f, 1.0f) + delta);
  gl_Position = u_renderTransform * vec4(a_sixClipPoint, 0.0f, 1.0f) + delta;
}
