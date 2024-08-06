#version 300 es

precision highp float;

#include ../helpers.glsl;

uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;
uniform float u_animationProgress;

in float a_size;
in vec4 a_color;
in float a_borderSize;
in vec4 a_borderColor;

out float v_size;
out vec4 v_color;
out float v_borderSize;
out vec4 v_borderColor;

in vec2 a_projectedGeoPoint;
in vec2 a_projectedGeoPreviousPoint;

void main() {
  vec2 projectedGeoPoint = mix(a_projectedGeoPreviousPoint, a_projectedGeoPoint, cubicInOut(u_animationProgress));

  gl_Position = u_viewportToClipTransform * u_projectedGeoToViewportTransform * vec4(projectedGeoPoint, 0.0f, 1.0f);

  float minimumPixel = 1.0;
  gl_PointSize = a_size + a_borderSize + minimumPixel;

  v_size = a_size;
  v_color = a_color;
  v_borderSize = a_borderSize;
  v_borderColor = a_borderColor;
}
