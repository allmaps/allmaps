// Remove background color
if(u_removeColorOptionsThreshold > 0.0f) {
  vec3 backgroundColorDiff = color.rgb - u_removeColorOptionsColor.rgb;
  float backgroundColorDistance = length(backgroundColorDiff);
  if(u_removeColor && backgroundColorDistance < u_removeColorOptionsThreshold) {
    float amount = smoothstep(u_removeColorOptionsThreshold - u_removeColorOptionsThreshold * (1.0f - u_removeColorOptionsHardness), u_removeColorOptionsThreshold, backgroundColorDistance);
    color = vec4(color.rgb * amount, amount);
  }
}

// Saturation
float gray = 0.21f * color.r + 0.71f * color.g + 0.07f * color.b;
color = vec4(color.rgb * (u_saturation) + (gray * (1.0f - u_saturation)), color.a);

// Colorize
if(u_colorize) {
  color = vec4((u_colorizeOptionsColor + color.rgb) * color.a, color.a);
}

// Opacity
color = vec4(color.rgb * u_opacity, color.a * u_opacity);
