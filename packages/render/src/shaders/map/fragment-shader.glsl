#version 300 es

precision highp float;
precision highp isampler2D;

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

uniform int u_scaleFactorForViewport;

uniform lowp sampler2DArray u_cachedTilesTextureArray;
uniform isampler2D u_cachedTilesResourceOriginPointsAndDimensionsTexture;
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
  int smallestScaleFactor;
  bool found = false;
  int foundIndex;

  // Prepare storage for the resulting cached tiles texture point that corresponds to the triangle point
  vec3 cachedTilesTexturePoint = vec3(0.0f, 0.0f, 0.0f);

  // Set the initial values
  color = vec4(0.0f, 0.0f, 0.0f, 0.0f);

  // Loop through all cached tiles
  for(int index = 0; index < cachedTilesCount; index += 1) {

    // Read the information of the tile
    float cachedTileResourceOriginPointX = float(texelFetch(u_cachedTilesResourceOriginPointsAndDimensionsTexture, ivec2(0, (index * 4)), 0));
    float cachedTileResourceOriginPointY = float(texelFetch(u_cachedTilesResourceOriginPointsAndDimensionsTexture, ivec2(0, (index * 4) + 1), 0));
    float cachedTileDimensionWidth = float(texelFetch(u_cachedTilesResourceOriginPointsAndDimensionsTexture, ivec2(0, (index * 4) + 2), 0));
    float cachedTileDimensionHeight = float(texelFetch(u_cachedTilesResourceOriginPointsAndDimensionsTexture, ivec2(0, (index * 4) + 3), 0));

    int cachedTileScaleFactor = texelFetch(u_cachedTilesScaleFactorsTexture, ivec2(0, index), 0).r;

    // If the triangle point is inside the tile, consider to use the tile:
    if(resourceTrianglePointX >= cachedTileResourceOriginPointX &&
      resourceTrianglePointX < cachedTileResourceOriginPointX + cachedTileDimensionWidth &&
      resourceTrianglePointY >= cachedTileResourceOriginPointY &&
      resourceTrianglePointY < cachedTileResourceOriginPointY + cachedTileDimensionHeight) {

      // If the smallest scale factor currently known is not set yet,
      // or if the scale factor of this tile is smaller (more detailed) then the scale factor currently known
      // update the smallest scale factor
      // and compute the cached tiles texture point that corresponds to the triangle point
      // Note: we can safely take the most detailed tile, since the depth is limited when we gather texture tiles
      if(!(smallestScaleFactor > 0) || cachedTileScaleFactor <= smallestScaleFactor) {
        smallestScaleFactor = cachedTileScaleFactor;
        found = true;
        foundIndex = index;

        float cachedTilePointX = (resourceTrianglePointX - cachedTileResourceOriginPointX) / float(cachedTileScaleFactor);
        float cachedTilePointY = (resourceTrianglePointY - cachedTileResourceOriginPointY) / float(cachedTileScaleFactor);

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
