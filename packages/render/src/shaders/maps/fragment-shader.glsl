#version 300 es

precision highp float;
precision highp isampler2D;

// Color mixing from Spectral.js
#include ../spectral.frag;
#include ../helpers.frag;

uniform float u_debug;

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

uniform vec4 u_colorDistortion00;
uniform vec4 u_colorDistortion01;
uniform vec4 u_colorDistortion1;
uniform vec4 u_colorDistortion2;
uniform vec4 u_colorDistortion3;
uniform vec4 u_colorGrid;

in vec2 v_resourceTrianglePoint;
in float v_trianglePointDistortion;
in float v_trianglePointIndex;
in vec4 v_trianglePointBarycentric;

out vec4 color;

void main() {
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
  color = vec4(0.0f, 0.0f, 0.0f, 0.0f);;

  // Loop through all cached tiles
  for(int index = 0; index < cachedTilesCount; index += 1) {

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

    #include post.frag;
    #include distortion.frag;
    #include debug.frag;
  }
}
