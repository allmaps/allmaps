#version 300 es

precision highp float;

#include ../helpers.glsl;

uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;
uniform float u_animationProgress;

in float a_viewportSize;
in vec4 a_color;
in float a_viewportBorderSize;
in vec4 a_borderColor;

out float v_viewportSize; // TODO: take devicePixelRation into account for this and borderSize
out vec4 v_color;
out float v_viewportBorderSize;
out vec4 v_borderColor;

in vec2 a_projectedGeoPoint;
in vec2 a_projectedGeoPreviousPoint;

void main() {
  vec2 projectedGeoPoint = mix(a_projectedGeoPreviousPoint, a_projectedGeoPoint, easing(u_animationProgress));

  gl_Position = u_viewportToClipTransform * u_projectedGeoToViewportTransform * vec4(projectedGeoPoint, 0.0f, 1.0f);

  float minimumPixel = 1.0;
  gl_PointSize = a_viewportSize + a_viewportBorderSize + minimumPixel;

  v_viewportSize = a_viewportSize;
  v_color = a_color;
  v_viewportBorderSize = a_viewportBorderSize;
  v_borderColor = a_borderColor;
}
