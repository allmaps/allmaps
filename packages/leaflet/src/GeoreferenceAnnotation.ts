/* eslint-disable @typescript-eslint/no-explicit-any */
// import { World } from '@allmaps/render'
import * as L from 'leaflet'

import type { Map, Coords } from 'leaflet'

// export interfacetype GeoreferenceAnnotationLayerOptions extends LayerOptions {
//   tileSize: object
//   tileLayers: object[]
//   tileUrls: string[]
// }

// export interface GeoreferenceAnnotationLayer extends Layer {
//   GeoreferenceAnnotation: GeoreferenceAnnotationLayer
//   // constructor(options?: GeoreferenceAnnotationLayerOptions)
//   // bringToFront(): this;
//   // getTileSize(): Point;
//   // protected createTile(coords: Coords, done: DoneCallback): HTMLElement;
// }

const GeoreferenceAnnotationLayer = L.Layer.extend({
  options: {
    source: [],

    // TEMP
    fragmentShader: 'void main(void) {gl_FragColor = vec4(0.2,0.2,0.2,1.0);}',
    uniforms: {}
  },

  initialize: function (options: any) {
    // this._container = L.DomUtil.create('div')

    // this._container.style.position = 'absolute'
    // this._container.style.width = '100%'
    // this._container.style.height = '100%'
    // this._container.classList.add('ol-layer')
    // this._container.classList.add('allmaps-warped-layer')

    // const pane = map.getPane(this.options.pane)
    // if (!pane) {
    //   throw new Error('Pane not found')
    // }

    // this._canvas = L.DomUtil.create('canvas', undefined, this._container)

    // pane.appendChild(this._container)

    // const gl = this._canvas.getContext('webgl2', { premultipliedAlpha: true })

    // if (!gl) {
    //   throw new Error('WebGL 2 not available')
    // }
    options = L.setOptions(this, options)

    this._renderer = L.DomUtil.create('canvas')
    this._renderer.width = this._renderer.height = options.tileSize
    this._glError = false

    const gl = (this._gl =
      this._renderer.getContext('webgl', {
        premultipliedAlpha: false
      }) ||
      this._renderer.getContext('experimental-webgl', {
        premultipliedAlpha: false
      }))
    gl.viewportWidth = options.tileSize
    gl.viewportHeight = options.tileSize

    // Create `TileLayer`s from the tileUrls option.
    this._tileLayers = Array.from(options.tileLayers)
    for (let i = 0; i < options.tileUrls.length && i < 8; i++) {
      this._tileLayers.push(L.tileLayer(options.tileUrls[i]))
    }

    this._loadGLProgram()

    // Init textures
    this._textures = []
    for (let i = 0; i < this._tileLayers.length && i < 8; i++) {
      this._textures[i] = gl.createTexture()
      gl.uniform1i(gl.getUniformLocation(this._glProgram, 'uTexture' + i), i)
    }
  },

  // @method getGlError(): String|undefined
  // If there was any error compiling/linking the shaders, returns a string
  // with information about that error. If there was no error, returns `undefined`.
  getGlError: function () {
    return this._glError
  },

  _loadGLProgram: function () {
    const gl = this._gl

    // Force using this vertex shader.
    // Just copy all attributes to predefined variants and set the vertex positions
    const vertexShaderCode =
      'attribute vec2 aVertexCoords;  ' +
      'attribute vec2 aTextureCoords;  ' +
      'attribute vec2 aCRSCoords;  ' +
      'attribute vec2 aLatLngCoords;  ' +
      'varying vec2 vTextureCoords;  ' +
      'varying vec2 vCRSCoords;  ' +
      'varying vec2 vLatLngCoords;  ' +
      'void main(void) {  ' +
      '	gl_Position = vec4(aVertexCoords , 1.0, 1.0);  ' +
      '	vTextureCoords = aTextureCoords;  ' +
      '	vCRSCoords = aCRSCoords;  ' +
      '	vLatLngCoords = aLatLngCoords;  ' +
      '}'

    // Force using this bit for the fragment shader. All fragment shaders
    // will use the same predefined variants, and
    let fragmentShaderHeader =
      'precision highp float;\n' +
      'uniform float uNow;\n' +
      'uniform vec3 uTileCoords;\n' +
      'varying vec2 vTextureCoords;\n' +
      'varying vec2 vCRSCoords;\n' +
      'varying vec2 vLatLngCoords;\n'

    for (let i = 0; i < this._tileLayers.length && i < 8; i++) {
      fragmentShaderHeader += 'uniform sampler2D uTexture' + i + ';\n'
    }

    fragmentShaderHeader += this._getUniformSizes()

    const program = (this._glProgram = gl.createProgram())
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(vertexShader, vertexShaderCode)
    gl.shaderSource(
      fragmentShader,
      fragmentShaderHeader + this.options.fragmentShader
    )
    gl.compileShader(vertexShader)
    gl.compileShader(fragmentShader)

    // @event shaderError
    // Fired when there was an error creating the shaders.
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      this._glError = gl.getShaderInfoLog(vertexShader)
      console.error(this._glError)
      return null
    }
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      this._glError = gl.getShaderInfoLog(fragmentShader)
      console.error(this._glError)
      return null
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    // There will be four vec2 vertex attributes per vertex:
    // aVertexCoords (always from -1 to +1), aTextureCoords (always from 0 to +1),
    // aLatLngCoords and aCRSCoords (both geographical and per-tile).
    this._aVertexPosition = gl.getAttribLocation(program, 'aVertexCoords')
    this._aTexPosition = gl.getAttribLocation(program, 'aTextureCoords')
    this._aCRSPosition = gl.getAttribLocation(program, 'aCRSCoords')
    this._aLatLngPosition = gl.getAttribLocation(program, 'aLatLngCoords')

    this._initUniforms(program)

    // If the shader is time-dependent (i.e. animated), or has custom uniforms,
    // init the texture cache
    if (this._isReRenderable) {
      this._fetchedTextures = {}
      this._2dContexts = {}
    }

    // 		console.log('Tex position: ', this._aTexPosition);
    // 		console.log('CRS position: ', this._aCRSPosition);
    // 		console.log("uNow position: ", this._uNowPosition);

    // Create three data buffer with 8 elements each - the (easting,northing)
    // CRS coords, the (s,t) texture coords and the viewport coords for each
    // of the 4 vertices
    // Data for the texel and viewport coords is totally static, and
    // needs to be declared only once.
    this._CRSBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._CRSBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW)
    if (this._aCRSPosition !== -1) {
      gl.enableVertexAttribArray(this._aCRSPosition)
      gl.vertexAttribPointer(this._aCRSPosition, 2, gl.FLOAT, false, 8, 0)
    }

    this._LatLngBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._LatLngBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.STATIC_DRAW)
    if (this._aLatLngPosition !== -1) {
      gl.enableVertexAttribArray(this._aLatLngPosition)
      gl.vertexAttribPointer(this._aLatLngPosition, 2, gl.FLOAT, false, 8, 0)
    }

    this._TexCoordsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._TexCoordsBuffer)

    // prettier-ignore
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          1.0, 0.0,
          0.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
        ]), gl.STATIC_DRAW);
    if (this._aTexPosition !== -1) {
      gl.enableVertexAttribArray(this._aTexPosition)
      gl.vertexAttribPointer(this._aTexPosition, 2, gl.FLOAT, false, 8, 0)
    }

    this._VertexCoordsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._VertexCoordsBuffer)

    // prettier-ignore
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
           1,  1,
          -1,  1,
           1, -1,
          -1, -1
        ]), gl.STATIC_DRAW);
    if (this._aVertexPosition !== -1) {
      gl.enableVertexAttribArray(this._aVertexPosition)
      gl.vertexAttribPointer(this._aVertexPosition, 2, gl.FLOAT, false, 8, 0)
    }
  },
  // // Looks at the size of the default values given for the uniforms.
  // // Returns a string valid for defining the uniforms in the shader header.
  // _getUniformSizes() {
  //   var defs = "";
  //   this._uniformSizes = {};
  //   for (var uniformName in this.options.uniforms) {
  //     var defaultValue = this.options.uniforms[uniformName];
  //     if (typeof defaultValue === "number") {
  //       this._uniformSizes[uniformName] = 0;
  //       defs += "uniform float " + uniformName + ";\n";
  //     } else if (defaultValue instanceof Array) {
  //       if (defaultValue.length > 4) {
  //         throw new Error("Max size for uniform value is 4 elements");
  //       }
  //       this._uniformSizes[uniformName] = defaultValue.length;
  //       if (defaultValue.length === 1) {
  //         defs += "uniform float " + uniformName + ";\n";
  //       } else {
  //         defs += "uniform vec" + defaultValue.length + " " + uniformName + ";\n";
  //       }
  //     } else {
  //       throw new Error(
  //         "Default value for uniforms must be either number or array of numbers"
  //       );
  //     }
  //   }
  //   return defs;
  // },

  // // Inits the uNow uniform, and the user-provided uniforms, given the current GL program.
  // // Sets the _isReRenderable property if there are any set uniforms.
  // _initUniforms(program) {
  //   var gl = this._gl;
  //   this._uTileCoordsPosition = gl.getUniformLocation(program, "uTileCoords");
  //   this._uNowPosition = gl.getUniformLocation(program, "uNow");
  //   this._isReRenderable = false;

  //   if (this._uNowPosition) {
  //     gl.uniform1f(this._uNowPosition, performance.now());
  //     this._isReRenderable = true;
  //   }

  //   this._uniformLocations = {};
  //   for (var uniformName in this.options.uniforms) {
  //     this._uniformLocations[uniformName] = gl.getUniformLocation(program, uniformName);
  //     this.setUniform(uniformName, this.options.uniforms[uniformName]);
  //     this._isReRenderable = true;
  //   }
  // },

  // This is called once per tile - uses the layer's GL context to
  //   render a tile, passing the complex space coordinates to the
  //   GPU, and asking to render the vertexes (as triangles) again.
  // Every pixel will be opaque, so there is no need to clear the scene.
  _render: function (coords: Coords) {
    const gl = this._gl
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0.5, 0.5, 0.5, 0)
    gl.enable(gl.BLEND)

    const tileBounds = this._tileCoordsToBounds(coords)
    const west = tileBounds.getWest(),
      east = tileBounds.getEast(),
      north = tileBounds.getNorth(),
      south = tileBounds.getSouth()

    // Create data array for LatLng buffer
    // prettier-ignore
    const latLngData = [
          // Vertex 0
          east, north,

          // Vertex 1
          west, north,

          // Vertex 2
          east, south,

          // Vertex 3
          west, south,
        ];

    // ...upload them to the GPU...
    gl.bindBuffer(gl.ARRAY_BUFFER, this._LatLngBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(latLngData), gl.STATIC_DRAW)

    // ...also create data array for CRS buffer...
    // Kinda inefficient, but doesn't look performance-critical
    const crs = this._map.options.crs,
      min = crs.project(L.latLng(south, west)),
      max = crs.project(L.latLng(north, east))

    // prettier-ignore
    const crsData = [
          // Vertex 0
          max.x, max.y,

          // Vertex 1
          min.x, max.y,

          // Vertex 2
          max.x, min.y,

          // Vertex 3
          min.x, min.y,
        ];

    // ...and also upload that to the GPU...
    gl.bindBuffer(gl.ARRAY_BUFFER, this._CRSBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(crsData), gl.STATIC_DRAW)

    // ...and also set the uTileCoords uniform for this tile
    gl.uniform3f(this._uTileCoordsPosition, coords.x, coords.y, coords.z)

    // ... and then the magic happens.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  },

  _bindTexture: function (index: number, imageData: unknown) {
    // Helper function. Binds a ImageData (HTMLImageElement, HTMLCanvasElement or
    // ImageBitmap) to a texture, given its index (0 to 7).
    // The image data is assumed to be in RGBA format.
    const gl = this._gl

    gl.activeTexture(gl.TEXTURE0 + index)
    gl.bindTexture(gl.TEXTURE_2D, this._textures[index])
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageData
    )
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_NEAREST
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.generateMipmap(gl.TEXTURE_2D)
  },

  onAdd: function (map: Map) {
    // Calculate initial position of container with `L.Map.latLngToLayerPoint()`, `getPixelOrigin()` and/or `getPixelBounds()`

    const point = L.point(0, 0) // TODO: change

    L.DomUtil.setPosition(this._canvas, point)

    // Add and position children elements if needed

    map.on('zoomend viewreset', this._update, this)
  },

  onRemove: function (map: Map) {
    this._container.remove()
    map.off('zoomend viewreset', this._update, this)
  },

  _update: function () {
    // Recalculate position of container

    const point = L.point(0, 0) // TODO: change

    L.DomUtil.setPosition(this._container, point)

    // Add/remove/reposition children elements if needed
  }
})

// L.Layer.georeferenceAnnotation = function () {
//   return new L.Layer.GeoreferenceAnnotation()
// }

export default GeoreferenceAnnotationLayer
