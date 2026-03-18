<script lang="ts">
  import { lonLatProjection, webMercatorProjection } from '@allmaps/project'
  import type { WebGL2WarpedMapOptions } from '@allmaps/render/webgl2'
  import type {
    DistortionMeasure,
    TransformationType
  } from '@allmaps/transform'
  import type { Projection } from '@allmaps/project'

  let {
    options = $bindable(),
    transformationTypes = [
      'straight',
      'helmert',
      'polynomial',
      'polynomial2',
      'polynomial3',
      'thinPlateSpline',
      'projective',
      'linear'
    ],
    distortionMeasures = [
      'log2sigma',
      'twoOmega',
      'airyKavr',
      'signDetJ',
      'thetaa'
    ],
    projections = [lonLatProjection, webMercatorProjection]
  }: {
    options: Partial<WebGL2WarpedMapOptions>
    transformationTypes?: TransformationType[]
    distortionMeasures?: DistortionMeasure[]
    projections?: Projection[]
  } = $props()
</script>

<div class="panel">
  <section class="group">
    <h3 class="group-label">Visibility</h3>

    <div class="field">
      <label for="visible">Visible</label>
      <input
        name="visible"
        id="visible"
        type="checkbox"
        bind:checked={options.visible}
      />
    </div>

    <div class="field">
      <label for="opacity">Opacity</label>
      <div class="range-row">
        <input
          type="range"
          id="opacity"
          name="opacity"
          min="0"
          max="1"
          step="0.001"
          bind:value={options.opacity}
        />
        <span class="range-value">{options.opacity?.toFixed(2) ?? '1.00'}</span>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Mask</h3>

    <div class="field">
      <label for="applyMask">Apply Mask</label>
      <input
        name="applyMask"
        id="applyMask"
        type="checkbox"
        bind:checked={options.applyMask}
      />
    </div>

    <div class="field">
      <label for="render-mask">Render Mask</label>
      <input
        name="render-mask"
        id="render-mask"
        type="checkbox"
        bind:checked={options.renderMask}
      />
    </div>

    <div class="field">
      <label for="render-full-mask">Render Full Mask</label>
      <input
        name="render-full-mask"
        id="render-full-mask"
        type="checkbox"
        bind:checked={options.renderFullMask}
      />
    </div>

    <div class="field">
      <label for="render-applied-mask">Render Applied Mask</label>
      <input
        name="render-applied-mask"
        id="render-applied-mask"
        type="checkbox"
        bind:checked={options.renderAppliedMask}
      />
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">GCPs</h3>

    <div class="field">
      <label for="render-gcps">Render GCPs</label>
      <input
        name="render-gcps"
        id="render-gcps"
        type="checkbox"
        bind:checked={options.renderGcps}
      />
    </div>

    <div class="field">
      <label for="render-transformed-gcps">Render Transformed GCPs</label>
      <input
        name="render-transformed-gcps"
        id="render-transformed-gcps"
        type="checkbox"
        bind:checked={options.renderTransformedGcps}
      />
    </div>

    <div class="field">
      <label for="render-vectors">Render Vectors</label>
      <input
        name="render-vectors"
        id="render-vectors"
        type="checkbox"
        bind:checked={options.renderVectors}
      />
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Transform</h3>

    <div class="field">
      <label for="transformationType">Type</label>
      <select id="transformationType" bind:value={options.transformationType}>
        {#each [undefined, ...transformationTypes] as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="distortion-measures"
        >Pre-compute all distortion measures</label
      >
      <input
        name="distortion-measures"
        id="distortion-measures"
        type="checkbox"
        checked={options.distortionMeasures === distortionMeasures}
        onchange={(e) =>
          (options.distortionMeasures = e.currentTarget.checked
            ? distortionMeasures
            : ['log2sigma'])}
      />
    </div>

    <div class="field">
      <label for="distortionMeasure">Distortion Measure</label>
      <select id="distortionMeasure" bind:value={options.distortionMeasure}>
        {#each [undefined, ...distortionMeasures] as d}
          <option value={d}>{d}</option>
        {/each}
      </select>
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Project</h3>

    <div class="field">
      <label for="internalProjection">Internal Projection</label>
      <select
        value={options.internalProjection?.name}
        onchange={(e) =>
          (options.internalProjection = projections.find(
            (p) => p?.name === e.currentTarget.value
          ))}
      >
        {#each [undefined, ...projections] as p}
          <option value={p?.name}>{p?.name}</option>
        {/each}
      </select>
    </div>

    <div class="field">
      <label for="projection">Projection</label>
      <select
        value={options.projection?.name}
        onchange={(e) =>
          (options.projection = projections.find(
            (p) => p?.name === e.currentTarget.value
          ))}
      >
        {#each projections as p}
          <option value={p?.name}>{p?.name}</option>
        {/each}
      </select>
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Remove Color</h3>

    <div class="field">
      <label for="remove-color">Enabled</label>
      <input
        name="remove-color"
        id="remove-color"
        type="checkbox"
        bind:checked={options.removeColor}
      />
    </div>

    <div class="field">
      <label for="remove-color-color">Color</label>
      <input
        type="color"
        id="remove-color-color"
        name="remove-color-color"
        bind:value={options.removeColorColor}
      />
    </div>

    <div class="field">
      <label for="remove-color-threshold">Threshold</label>
      <div class="range-row">
        <input
          type="range"
          id="remove-color-threshold"
          name="remove-color-threshold"
          min="0"
          max="1"
          step="0.001"
          bind:value={options.removeColorThreshold}
        />
        <span class="range-value"
          >{options.removeColorThreshold?.toFixed(2) ?? '0.00'}</span
        >
      </div>
    </div>

    <div class="field">
      <label for="remove-color-hardness">Hardness</label>
      <div class="range-row">
        <input
          type="range"
          id="remove-color-hardness"
          name="remove-color-hardness"
          min="0"
          max="1"
          step="0.001"
          bind:value={options.removeColorHardness}
        />
        <span class="range-value"
          >{options.removeColorHardness?.toFixed(2) ?? '0.30'}</span
        >
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Colorize</h3>

    <div class="field">
      <label for="colorize">Enabled</label>
      <input
        type="checkbox"
        id="colorize"
        name="colorize"
        bind:checked={options.colorize}
      />
    </div>

    <div class="field">
      <label for="colorize-color">Color</label>
      <input
        type="color"
        id="colorize-color"
        name="colorize-color"
        bind:value={options.colorizeColor}
      />
    </div>

    <div class="field">
      <label for="saturation">Saturation</label>
      <div class="range-row">
        <input
          type="range"
          id="saturation"
          name="saturation"
          min="0"
          max="1"
          step="0.001"
          bind:value={options.saturation}
        />
        <span class="range-value"
          >{options.saturation?.toFixed(2) ?? '1.00'}</span
        >
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-label">Debug</h3>

    <div class="field">
      <label for="render-grid">Render Grid</label>
      <input
        name="render-grid"
        id="render-grid"
        type="checkbox"
        bind:checked={options.renderGrid}
      />
    </div>

    <div class="field">
      <label for="debug-triangles">Triangles</label>
      <input
        name="debug-triangles"
        id="debug-triangles"
        type="checkbox"
        bind:checked={options.debugTriangles}
      />
    </div>

    <div class="field">
      <label for="debug-tiles">Tiles</label>
      <input
        name="debug-tiles"
        id="debug-tiles"
        type="checkbox"
        bind:checked={options.debugTiles}
      />
    </div>
  </section>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.7rem;
    font-family: ui-monospace, monospace;
    display: block;
    columns: 160px; /* min column width — adds a 2nd column when panel is wide enough */
    column-gap: 0.3rem;
    max-height: 100vh;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 4px;
    padding: 0.4rem 0.5rem;
    background-color: white;
    break-inside: avoid;
    margin-bottom: 0.2rem;
  }

  .group-label {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.4;
    margin: 0 0 0.2rem;
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 1rem;
  }

  .field label {
    opacity: 0.75;
    flex-shrink: 0;
  }

  .range-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    justify-content: flex-end;
  }

  input[type='range'] {
    flex: 1;
    max-width: 100px;
  }

  .range-value {
    opacity: 0.5;
    min-width: 2.5ch;
    text-align: right;
  }

  select {
    background: transparent;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 3px;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    padding: 0.1rem 0.25rem;
    max-width: 100px;
  }

  input[type='color'] {
    width: 2rem;
    height: 1.4rem;
    padding: 0.1rem;
    background: none;
    cursor: pointer;
  }
</style>
