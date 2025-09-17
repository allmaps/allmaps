// Distortion
if(u_distortion) {
  // color = colorWhite; // TODO: Add option to not display image
  // color = colorTransparant; // TODO: Add option to not display image

  float trianglePointDistortion = v_trianglePointDistortion;

  // Introduce septs
  // TODO: Add component to toggle stepwise vs continuous
  trianglePointDistortion = floor(trianglePointDistortion * 10.0f) / 10.0f;

  // Clamp value used in mix between +1 and -1
  float trianglePointDistortionMix = clamp(trianglePointDistortion, -1.0f, 1.0f);

  switch(u_distortionMeasure) {
    case 0:
      if(trianglePointDistortion > 0.0f) {
        color = mix(color, u_distortionColor00, trianglePointDistortionMix);
      } else {
        color = mix(color, u_distortionColor01, abs(trianglePointDistortionMix));
      }
      break;
    case 1:
      color = mix(color, u_distortionColor1, trianglePointDistortionMix);
      break;
    case 2:
      color = mix(color, u_distortionColor2, trianglePointDistortionMix);
      break;
    case 3:
      color = trianglePointDistortion == -1.0f ? u_distortionColor3 : color;
      break;
    default:
      color = color;
  }
}

// Grid
if(u_renderGrid) {
  float gridSize = 20.0f * float(u_scaleFactorForViewport);
  float gridWidth = 2.0f * float(u_scaleFactorForViewport);
  if(mod(float(resourceTrianglePointX) + gridWidth / 2.0f, gridSize) < gridWidth || mod(float(resourceTrianglePointY) + gridWidth / 2.0f, gridSize) < gridWidth) {
    color = u_renderGridColor;
  }
}
