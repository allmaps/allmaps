#version 300 es

precision highp float;
precision highp isampler2D;

// Color mixing from Spectral.js
#include ../spectral.glsl;
#include ../helpers.glsl;

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

uniform int u_bestScaleFactor;

uniform sampler2D u_packedTilesTexture;
uniform isampler2D u_packedTilesPositionsTexture;
uniform isampler2D u_packedTilesResourcePositionsAndDimensionsTexture;
uniform isampler2D u_packedTilesScaleFactorsTexture;

uniform vec4 u_colorDistortion00;
uniform vec4 u_colorDistortion01;
uniform vec4 u_colorDistortion1;
uniform vec4 u_colorDistortion2;
uniform vec4 u_colorDistortion3;
uniform vec4 u_colorGrid;

in vec2 v_resourceTrianglePoint;
in float v_triangleIndex;
in float v_trianglePointDistortion;

out vec4 color;

void main() {
  float resourceTrianglePointX = v_resourceTrianglePoint.x;
  float resourceTrianglePointY = v_resourceTrianglePoint.y;

  // Reading information on packed tiles from textures
  int packedTilesCount = textureSize(u_packedTilesPositionsTexture, 0).y;
  ivec2 packedTilesTextureSize = textureSize(u_packedTilesTexture, 0);

  // Setting references for the for loop
  int smallestScaleFactorDiff = 256 * 256; // Starting with very high number
  int bestScaleFactor = 0;

  // Prepare storage for the resulting packed tiles texture point that corresponds to the triangle point
  vec2 packedTilesTexturePoint = vec2(0.0f, 0.0f);

  // Set the initial values
  color = vec4(0.0f, 0.0f, 0.0f, 0.0f);;
  bool found = false;

  // Loop through all packed tiles
  for(int index = 0; index < packedTilesCount; index += 1) {

    // Read the information of the tile
    ivec2 packedTilePosition = texelFetch(u_packedTilesPositionsTexture, ivec2(0, index), 0).rg;
    ivec4 packedTileResourcePositionAndDimension = texelFetch(u_packedTilesResourcePositionsAndDimensionsTexture, ivec2(0, index), 0);
    int packedTileScaleFactor = texelFetch(u_packedTilesScaleFactorsTexture, ivec2(0, index), 0).r;

    float packedTilePositionX = float(packedTilePosition.r);
    float packedTilePositionY = float(packedTilePosition.g);

    float packedTileResourcePositionX = float(packedTileResourcePositionAndDimension.r);
    float packedTileResourcePositionY = float(packedTileResourcePositionAndDimension.g);

    float packedTileDimensionWidth = float(packedTileResourcePositionAndDimension.b);
    float packedTileDimensionHeight = float(packedTileResourcePositionAndDimension.a);

    // If the triangle point is inside the tile, consider to use the tile:
    // if the scale factor is closer to the best scale factor for this map then currently known one
    // update the smallest scale factor diff
    // and compute the packed tiles texture point that corresponds to the triangle point
    if(resourceTrianglePointX >= packedTileResourcePositionX &&
      resourceTrianglePointX < packedTileResourcePositionX + packedTileDimensionWidth &&
      resourceTrianglePointY >= packedTileResourcePositionY &&
      resourceTrianglePointY < packedTileResourcePositionY + packedTileDimensionHeight) {
      found = true;

      int scaleFactorDiff = abs(u_bestScaleFactor - packedTileScaleFactor);

      if(scaleFactorDiff < smallestScaleFactorDiff || bestScaleFactor == 0) {

        smallestScaleFactorDiff = scaleFactorDiff;
        bestScaleFactor = packedTileScaleFactor;

        float packedTilePointX = (resourceTrianglePointX - packedTileResourcePositionX) / float(bestScaleFactor);
        float packedTilePointY = (resourceTrianglePointY - packedTileResourcePositionY) / float(bestScaleFactor);

        float packedTilesPointX = packedTilePositionX + packedTilePointX;
        float packedTilesPointY = packedTilePositionY + packedTilePointY;

        float packedTilesTexturePointX = packedTilesPointX / float(packedTilesTextureSize.x);
        float packedTilesTexturePointY = packedTilesPointY / float(packedTilesTextureSize.y);

        packedTilesTexturePoint = vec2(packedTilesTexturePointX, packedTilesTexturePointY);
      }
    }
  }

  if(found == true) {
    // Read color of the point at its packed tiles texture point coordinates in the packed tiles texture
    color = texture(u_packedTilesTexture, packedTilesTexturePoint);

    #include post.glsl;
    #include distortion.glsl;
    #include debug.glsl;
  }
}
