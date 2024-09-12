#version 300 es

precision highp float;
precision highp isampler2D;

// Color mixing from Spectral.js
#include spectral.frag;

uniform bool u_removeColor;
uniform vec3 u_removeColorOptionsColor;
uniform float u_removeColorOptionsThreshold;
uniform float u_removeColorOptionsHardness;

uniform bool u_colorize;
uniform vec3 u_colorizeOptionsColor;

uniform bool u_grid;

uniform float u_opacity;
uniform float u_saturation;

uniform bool u_distortion;
uniform int u_distortionOptionsdistortionMeasure;

uniform int u_currentBestScaleFactor;

uniform lowp sampler2DArray u_cachedTilesTextureArray;
uniform isampler2D u_cachedTilesResourcePositionsAndDimensionsTexture;
uniform isampler2D u_cachedTilesScaleFactorsTexture;

in vec2 v_resourceTrianglePoint;
in float v_triangleIndex;
in float v_trianglePointDistortion;

out vec4 color;

vec4 rgbToVec4(int r, int g, int b) {
  return vec4(float(r) / 255.0f, float(g) / 255.0f, float(b) / 255.0f, 1.0f);
}

void main() {
  // Colors
  // TODO: supply colors from JavaScript
  // TODO: move to distortion.frag
  vec4 colorTransparent = vec4(0.0f, 0.0f, 0.0f, 0.0f);
  vec4 colorWhite = vec4(1.0f, 1.0f, 1.0f, 1.0f);
  vec4 colorBlack = vec4(0.0f, 0.0f, 0.0f, 1.0f);

  vec4 colorGreen300 = vec4(0.5254f, 0.9372f, 0.6745f, 1.0f);
  vec4 colorPurple300 = vec4(0.8470f, 0.7058f, 0.9960f, 1.0f);
  vec4 colorRed300 = vec4(0.9882f, 0.6470f, 0.6470f, 1.0f);
  vec4 colorYellow300 = vec4(0.9921f, 0.8784f, 0.2784f, 1.0f);
  vec4 colorOrange300 = vec4(0.9921f, 0.7294f, 0.4549f, 1.0f);
  vec4 colorPink300 = vec4(0.9764f, 0.6588f, 0.8313f, 1.0f);
  vec4 colorBlue300 = vec4(0.5764f, 0.7725f, 0.9921f, 1.0f);
  vec4 colorGrey300 = vec4(0.8196f, 0.8352f, 0.8588f, 1.0f);

  vec4 colorGreen500 = vec4(0.1333f, 0.7725f, 0.3686f, 1.0f);
  vec4 colorPurple500 = vec4(0.6588f, 0.3333f, 0.9686f, 1.0f);
  vec4 colorRed500 = vec4(0.9372f, 0.2666f, 0.2666f, 1.0f);
  vec4 colorYellow500 = vec4(0.9176f, 0.7019f, 0.0313f, 1.0f);
  vec4 colorOrange500 = vec4(0.9764f, 0.4509f, 0.0862f, 1.0f);
  vec4 colorPink500 = vec4(0.9254f, 0.2823f, 0.6f, 1.0f);
  vec4 colorBlue500 = vec4(0.2313f, 0.5098f, 0.9647f, 1.0f);
  vec4 colorGrey500 = vec4(0.4196f, 0.4470f, 0.5019f, 1.0f);

  float resourceTrianglePointX = v_resourceTrianglePoint.x;
  float resourceTrianglePointY = v_resourceTrianglePoint.y;

  // Reading information on cached tiles from textures
  ivec3 cachedTilesTextureSize = textureSize(u_cachedTilesTextureArray, 0);
  int cachedTilesCount = cachedTilesTextureSize.z;

  // Setting references for the for loop
  int smallestScaleFactor = int(pow(2.0, 8.0)); // Starting with very high number
  bool found = false;
  int foundIndex;

  // Prepare storage for the resulting cached tiles texture point that corresponds to the triangle point
  vec3 cachedTilesTexturePoint = vec3(0.0f, 0.0f, 0.0f);

  // Set the initial values
  color = colorTransparent;

  // Loop through all cached tiles
  for(int index= 0 ; index < cachedTilesCount; index += 1) {

    // Read the information of the tile
    ivec4 cachedTileResourcePositionAndDimension = texelFetch(u_cachedTilesResourcePositionsAndDimensionsTexture, ivec2(0, index), 0);
    int cachedTileScaleFactor = texelFetch(u_cachedTilesScaleFactorsTexture, ivec2(0, index), 0).r;

    float cachedTileResourcePositionX = float(cachedTileResourcePositionAndDimension.r);
    float cachedTileResourcePositionY = float(cachedTileResourcePositionAndDimension.g);

    float cachedTileDimensionWidth = float(cachedTileResourcePositionAndDimension.b);
    float cachedTileDimensionHeight = float(cachedTileResourcePositionAndDimension.a);

    // If the triangle point is inside the tile, consider to use the tile:
    if(resourceTrianglePointX >= cachedTileResourcePositionX &&
      resourceTrianglePointX < cachedTileResourcePositionX + cachedTileDimensionWidth &&
      resourceTrianglePointY >= cachedTileResourcePositionY &&
      resourceTrianglePointY < cachedTileResourcePositionY + cachedTileDimensionHeight) {

      // If the scale factor is smaller (more detailed) then the best scale factor for this map then currently known
      // update the current best scale factor
      // and compute the cached tiles texture point that corresponds to the triangle point
      // Note: we can safely take the deepest one, since the depth is limited when we gather texture tiles
      if(cachedTileScaleFactor < smallestScaleFactor) {
        smallestScaleFactor = cachedTileScaleFactor;
        found = true;
        foundIndex = index;

        float cachedTilePointX = (resourceTrianglePointX - cachedTileResourcePositionX) / float(cachedTileScaleFactor);
        float cachedTilePointY = (resourceTrianglePointY - cachedTileResourcePositionY) / float(cachedTileScaleFactor);

        float cachedTilesTexturePointX = cachedTilePointX / float(cachedTilesTextureSize.x);
        float cachedTilesTexturePointY = cachedTilePointY / float(cachedTilesTextureSize.y);

        cachedTilesTexturePoint = vec3(cachedTilesTexturePointX, cachedTilesTexturePointY, index);
      }
    }
  }

  if(found == true) {
    // Read color of the point at its chached tiles texture point coordinates in the cached tiles texture array
    color = texture(u_cachedTilesTextureArray, cachedTilesTexturePoint);

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
    // TODO: move to distortion.frag
    if(u_distortion) {
      // color = colorWhite; // TODO: Add option to not display image
      // color = colorTransparant; // TODO: Add option to not display image

      float trianglePointDistortion = v_trianglePointDistortion;

      // TODO: Add component to toggle stepwise vs continuous
      trianglePointDistortion = floor(trianglePointDistortion * 10.0f) / 10.0f;

      switch(u_distortionOptionsdistortionMeasure) {
        case 0:
          if(trianglePointDistortion > 0.0f) {
            color = spectral_mix(color, colorRed500, trianglePointDistortion);
          } else {
            color = spectral_mix(color, colorBlue500, abs(trianglePointDistortion));
          }
          break;
        case 1:
          color = spectral_mix(color, colorGreen500, trianglePointDistortion);
          break;
        case 2:
          color = spectral_mix(color, colorYellow500, trianglePointDistortion);
          break;
        case 3:
          color = trianglePointDistortion == -1.0f ? colorRed300 : color;
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

    // Tiles
    // TODO: make this a rendering option
    if(false) {
      color = vec4(abs(sin(float(foundIndex))), abs(sin(float(foundIndex) + 1.0f)), abs(sin(float(foundIndex) + 2.0f)), 1);
    }

    // Grid
    if(u_grid) {
      float gridSize = 20.0f * float(u_currentBestScaleFactor);
      float gridWidth = 2.0f * float(u_currentBestScaleFactor);
      if(mod(float(resourceTrianglePointX) + gridWidth / 2.0f, gridSize) < gridWidth || mod(float(resourceTrianglePointY) + gridWidth / 2.0f, gridSize) < gridWidth) {
        color = colorBlack;
      }
    }
  } else {
    // Unfound tiles
    if(false) {
      color = vec4(0.0, 0.0, 0.0, 1.0);
    }
  }
}
