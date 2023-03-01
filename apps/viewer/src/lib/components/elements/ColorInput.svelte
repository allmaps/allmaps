<div>
  <!-- <input
    id="input-colorize-color"
    name="input-colorize-color"
    type="color"
    bind:value={colorizeColorValue}
    on:input={onColorizeColorInput}
  /> -->
  <label for="input-colorize-color">Colorize color</label>
</div>

<style>
  #style1 {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100px;
    height: 100px;
    background-color: transparent;
    border: none;
    cursor: pointer;
  }
  #style1::-webkit-color-swatch {
    border-radius: 15px;
    border: none;
  }
  #style1::-moz-color-swatch {
    border-radius: 15px;
    border: none;
  }
</style>
