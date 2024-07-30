#version 300 es

precision highp float;

uniform mat4 u_renderTransform;
uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;

in vec2 a_projectedGeoPoint;
in vec2 a_projectedGeoOtherPoint;
in float a_normalSign;

// out float v_distance;

void main() {
  float viewportLineWidth = 2.0;

  vec2 viewportPoint = (u_projectedGeoToViewportTransform * vec4(a_projectedGeoPoint, 0.0f, 1.0f)).xy;
  vec2 viewportOtherPoint = (u_projectedGeoToViewportTransform * vec4(a_projectedGeoOtherPoint, 0.0f, 1.0f)).xy;

  vec2 viewportNormal =  normalize(a_normalSign * vec2(viewportOtherPoint.y-viewportPoint.y, -(viewportOtherPoint.x-viewportPoint.x)));
  vec2 viewportDelta = viewportNormal * viewportLineWidth;
  viewportPoint = viewportPoint + viewportDelta;

  // v_distance = abs(dot(viewportNormal, viewportPoint));

  vec4 clipPoint = u_viewportToClipTransform * vec4(viewportPoint, 0, 1);
  gl_Position = u_renderTransform * clipPoint;
}
