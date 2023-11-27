#version 300 es

precision highp float;

uniform mat4 u_renderTransform;
uniform float u_animationProgress;

in vec2 a_clipCurrentTrianglePoint;
in vec2 a_clipNewTrianglePoint;
in vec2 a_resourceTrianglePoint;
in float a_triangleIndex;

out vec2 v_resourceTrianglePoint;
out float v_triangleIndex;

float cubicInOut(float t) {
  return t < 0.5f ? 4.0f * t * t * t : 0.5f * pow(2.0f * t - 2.0f, 3.0f) + 1.0f;
}

void main() {
  // Pass attributes as varyings to fragment shader
  v_resourceTrianglePoint = a_resourceTrianglePoint;
  v_triangleIndex = a_triangleIndex;

  // Compute triangle vertex coordinates by mixing current and new
  vec2 clipTrianglePoint = mix(a_clipCurrentTrianglePoint, a_clipNewTrianglePoint, cubicInOut(u_animationProgress));

  // Set triangle points coordinates
  // Variables that start with gl_ are special global variables
  // gl_Position stores the vertex (or 'point') positions (or 'coordinates') in clip coordinates (which go from -1 to 1.)
  gl_Position = u_renderTransform * vec4(clipTrianglePoint, 0.0f, 1.0f);
}
