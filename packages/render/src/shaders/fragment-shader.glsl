#version 300 es

precision highp float;
precision highp isampler2D;

// Color mixing from Spectral.js
#include "spectral.glsl"
// End of color mixing from Spectral.js

uniform bool u_removeColor;
uniform vec3 u_removeColorOptionsColor;
uniform float u_removeColorOptionsThreshold;
uniform float u_removeColorOptionsHardness;

uniform bool u_colorize;
uniform vec3 u_colorizeOptionsColor;

uniform float u_opacity;
uniform float u_saturation;

uniform bool u_distortion;
uniform int u_distortionOptionsdistortionMeasure;

uniform int u_bestScaleFactor;

uniform sampler2D u_packedTilesTexture;
uniform isampler2D u_packedTilesPositionsTexture;
uniform isampler2D u_packedTilesResourcePositionsAndDimensionsTexture;
uniform isampler2D u_packedTilesScaleFactorsTexture;

in vec2 v_resourceTrianglePoint;
in float v_triangleIndex;
in float v_trianglePointDistortion;

out vec4 color;

vec4 rgbToVec4(int r, int g, int b) {
    return vec4(float(r) / 255.0, float(g) / 255.0, float(b) / 255.0, 1.0);
}

void main() {
  // Colors
  vec4 colorTransparent = vec4(0.0, 0.0, 0.0, 0.0);
  vec4 colorWhite = vec4(1.0, 1.0, 1.0, 1.0);
  vec4 colorBlack = vec4(0.0, 0.0, 0.0, 1.0);

  vec4 colorGreen300 = vec4(0.5254, 0.9372, 0.6745, 1.0);
  vec4 colorPurple300 = vec4(0.8470, 0.7058, 0.9960, 1.0);
  vec4 colorRed300 = vec4(0.9882, 0.6470, 0.6470, 1.0);
  vec4 colorYellow300 = vec4(0.9921, 0.8784, 0.2784, 1.0);
  vec4 colorOrange300 = vec4(0.9921, 0.7294, 0.4549, 1.0);
  vec4 colorPink300 = vec4(0.9764, 0.6588, 0.8313, 1.0);
  vec4 colorBlue300 = vec4(0.5764, 0.7725, 0.9921, 1.0);
  vec4 colorGrey300 = vec4(0.8196, 0.8352, 0.8588, 1.0);

  vec4 colorGreen500 = vec4(0.1333, 0.7725, 0.3686, 1.0);
  vec4 colorPurple500 = vec4(0.6588, 0.3333, 0.9686, 1.0);
  vec4 colorRed500 = vec4(0.9372, 0.2666, 0.2666, 1.0);
  vec4 colorYellow500 = vec4(0.9176, 0.7019, 0.0313, 1.0);
  vec4 colorOrange500 = vec4(0.9764, 0.4509, 0.0862, 1.0);
  vec4 colorPink500 = vec4(0.9254, 0.2823, 0.6, 1.0);
  vec4 colorBlue500 = vec4(0.2313, 0.5098, 0.9647, 1.0);
  vec4 colorGrey500 = vec4(0.4196, 0.4470, 0.5019, 1.0);

  // The treated triangle point
  int resourceTrianglePointX = int(round(v_resourceTrianglePoint.x));
  int resourceTrianglePointY = int(round(v_resourceTrianglePoint.y));

  // Reading information on packed tiles from textures
  int packedTilesCount = textureSize(u_packedTilesPositionsTexture, 0).y;
  ivec2 packedTilesTextureSize = textureSize(u_packedTilesTexture, 0);

  // Setting references for the for loop
  int smallestScaleFactorDiff = 256 * 256; // Starting with very high number
  int bestScaleFactor = 0;

  // Prepare storage for the resulting packed tiles texture point that corresponds to the treated triangle point
  vec2 packedTilesTexturePoint = vec2(0.0f, 0.0f);

  // Set the initial values
  color = colorTransparent;
  bool found = false;

  // Loop through all packed tiles
  for(int index = 0; index < packedTilesCount; index += 1) {

    // Read the information of the tile
    ivec2 packedTilePosition = texelFetch(u_packedTilesPositionsTexture, ivec2(0, index), 0).rg;
    ivec4 packedTileResourcePositionAndDimension = texelFetch(u_packedTilesResourcePositionsAndDimensionsTexture, ivec2(0, index), 0);
    int packedTileScaleFactor = texelFetch(u_packedTilesScaleFactorsTexture, ivec2(0, index), 0).r;

    float packedTilePositionX = float(packedTilePosition.r);
    float packedTilePositionY = float(packedTilePosition.g);

    int packedTileResourcePositionX = packedTileResourcePositionAndDimension.r;
    int packedTileResourcePositionY = packedTileResourcePositionAndDimension.g;

    int packedTileDimensionWidth = packedTileResourcePositionAndDimension.b;
    int packedTileDimensionHeight = packedTileResourcePositionAndDimension.a;

    // If the treated triangle point is inside the tile, consider to use the tile:
    // if the scale factor is closer to the best scale factor for this map then currently known one
    // update the smallest scale factor diff
    // and compute the packed tiles texture point that corresponds to the treated triangle point
    if(resourceTrianglePointX >= packedTileResourcePositionX &&
      resourceTrianglePointX < packedTileResourcePositionX + packedTileDimensionWidth &&
      resourceTrianglePointY >= packedTileResourcePositionY &&
      resourceTrianglePointY < packedTileResourcePositionY + packedTileDimensionHeight) {
      found = true;

      int scaleFactorDiff = abs(u_bestScaleFactor - packedTileScaleFactor);

      if(scaleFactorDiff < smallestScaleFactorDiff || bestScaleFactor == 0) {

        smallestScaleFactorDiff = scaleFactorDiff;
        bestScaleFactor = packedTileScaleFactor;

        float packedTilePointX = float(resourceTrianglePointX - packedTileResourcePositionX) / float(bestScaleFactor);
        float packedTilePointY = float(resourceTrianglePointY - packedTileResourcePositionY) / float(bestScaleFactor);

        float packedTilesPointX = packedTilePositionX + packedTilePointX;
        float packedTilesPointY = packedTilePositionY + packedTilePointY;

        float packedTilesTexturePointX = round(packedTilesPointX) / float(packedTilesTextureSize.x);
        float packedTilesTexturePointY = round(packedTilesPointY) / float(packedTilesTextureSize.y);

        packedTilesTexturePoint = vec2(packedTilesTexturePointX, packedTilesTexturePointY);
      }
    }
  }

  if(found == true) {
    // Read color of the treated point at its packed tiles texture point coordinates in the packed tiles texture
    color = texture(u_packedTilesTexture, packedTilesTexturePoint);

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

    // Distortion
    // color = colorWhite; // Set option to not display image

    float trianglePointDistortion = v_trianglePointDistortion;
    trianglePointDistortion = floor(trianglePointDistortion*10.0)/10.0; // Set options to do stepwise

    if (u_distortion) {
      switch (u_distortionOptionsdistortionMeasure) {
        case 0:
          if (trianglePointDistortion > 0.0) {
            color = spectral_mix(color, colorRed500, trianglePointDistortion);
          } else {
            color = spectral_mix(color, colorBlue500, abs(trianglePointDistortion));
          }
          break;
        case 1:
          color = spectral_mix(color, colorGreen500, trianglePointDistortion);
          break;
        case 2:
          color = spectral_mix(color, colorYellow500, trianglePointDistortion*4.0);
          break;
        case 3:
          color = trianglePointDistortion == -1.0 ? colorRed300 : color;
          break;
        default:
          color = color;
      }
    }

    // Triangles
    // TODO: make this a rendering option
    if(false) {
      color = vec4(abs(sin(v_triangleIndex)), abs(sin(v_triangleIndex + 1.0f)), abs(sin(v_triangleIndex + 2.0f)), 1);
    }

    // Grid
    // TODO: make this a rendering option
    if(false) {
      float gridSize = 20.0 * float(u_bestScaleFactor);
      float gridWidth = 2.0 * float(u_bestScaleFactor);
      if(mod(float(resourceTrianglePointX)+gridWidth/2.0, gridSize) < gridWidth ||  mod(float(resourceTrianglePointY)+gridWidth/2.0, gridSize) < gridWidth) {
        color = colorBlack;
      }
    }
  }
}
