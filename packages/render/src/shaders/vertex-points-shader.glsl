#version 300 es

precision highp float;

uniform mat4 u_renderTransform;
uniform float u_size;
uniform float u_edgeSize;


in vec2 a_clipPoint;

void main() {
  // Set triangle points coordinates
  // Variables that start with gl_ are special global variables
  // gl_Position stores the vertex (or 'point') positions (or 'coordinates') in clip coordinates (which go from -1 to 1.)

  gl_Position = u_renderTransform * vec4(a_clipPoint, 0.0f, 1.0f);

  float minimumPixel = 1.0;
  gl_PointSize = u_size + u_edgeSize + minimumPixel;
  // gl_PointSize = 10.0;
}
