#version 300 es

precision highp float;
precision highp isampler2D;

in float v_viewportSize;
in vec4 v_color;
in float v_viewportBorderSize;
in vec4 v_borderColor;

out vec4 color;

void main() {
  // Discard pixels outside of clip space around point (from -1 to 1)
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  // Apply color
  color = v_color;

  // Apply border
  float borderSmoothStep = smoothstep(
      v_viewportSize - v_viewportBorderSize - 2.0,
      v_viewportSize - v_viewportBorderSize,
      distance * (v_viewportSize + v_viewportBorderSize)
  );
  color = (v_borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
