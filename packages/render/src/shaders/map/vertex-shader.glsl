#version 300 es

precision highp float;

#include ../helpers.frag;

uniform mat4 u_renderTransform;
uniform float u_animationProgress;

in vec2 a_resourceTrianglePoint;
in vec2 a_clipPreviousTrianglePoint;
in vec2 a_clipTrianglePoint;
in float a_previousTrianglePointDistortion;
in float a_trianglePointDistortion;
in float a_trianglePointIndex;

out vec2 v_resourceTrianglePoint;
out float v_trianglePointDistortion;
out float v_trianglePointIndex;
out vec4 v_trianglePointBarycentric;

void main() {
  // Mixing previous and new triangle points
  vec2 clipTrianglePoint = mix(a_clipPreviousTrianglePoint, a_clipTrianglePoint, easing(u_animationProgress));
  float trianglePointDistortion = mix(a_previousTrianglePointDistortion, a_trianglePointDistortion, easing(u_animationProgress));

  // Set triangle points coordinates
  // Variables that start with gl_ are special global variables
  // gl_Position stores the vertex (or 'point') positions (or 'coordinates') in clip coordinates (which go from -1 to 1.)

  gl_Position = u_renderTransform * vec4(clipTrianglePoint, 0.0f, 1.0f);

  // Pass attributes as varyings to fragment shader
  v_resourceTrianglePoint = a_resourceTrianglePoint;
  v_trianglePointDistortion = trianglePointDistortion;
  v_trianglePointIndex = a_trianglePointIndex;

  float trianglePointLocalIndex = mod(a_trianglePointIndex, 3.0);
  if(trianglePointLocalIndex == 0.0) v_trianglePointBarycentric = vec4(1.0, 0, 0, 1.0);
  if(trianglePointLocalIndex == 1.0) v_trianglePointBarycentric = vec4(0.0, 1.0, 0, 1.0);
  if(trianglePointLocalIndex == 2.0) v_trianglePointBarycentric = vec4(0.0, 0, 1.0, 1.0);
}
