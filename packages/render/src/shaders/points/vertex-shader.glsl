#version 300 es

precision highp float;

uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;
uniform float u_size;
uniform float u_edgeSize;

in vec2 a_projectedGeoPoint;

void main() {
  gl_Position = u_viewportToClipTransform * u_projectedGeoToViewportTransform * vec4(a_projectedGeoPoint, 0.0f, 1.0f);

  float minimumPixel = 1.0;
  gl_PointSize = u_size + u_edgeSize + minimumPixel;
}
