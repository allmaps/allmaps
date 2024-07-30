#version 300 es

precision highp float;
precision highp isampler2D;

// in float v_distance;

out vec4 color;

void main() {
  // Apply color
  color = vec4(0, 0, 0, 1);
  // vec4 borderColor = vec4(1, 1, 1, 1);

  // float size = 8.0;
  // float borderSize = 1.0;

  // // Apply border
  // float borderSmoothStep = smoothstep(
  //     size - borderSize - 2.0,
  //     size - borderSize,
  //     v_distance * (size + borderSize)
  // );
  // color = (borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
