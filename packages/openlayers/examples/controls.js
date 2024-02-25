function initializeControls(
  controlsHtmlUrl,
  warpedMapLayer,
  handleAddMapClicked
) {
  fetch(controlsHtmlUrl)
    .then((response) => response.text())
    .then((html) => {
      document.getElementById('controls').innerHTML = html
      initializeEventListeners()
    })

  function initializeEventListeners() {
    document.querySelector('#opacity').addEventListener('input', (event) => {
      const opacity = event.target.valueAsNumber
      warpedMapLayer.setOpacity(opacity)
    })

    function setRemoveColor() {
      const color = document.querySelector('#background-color').value

      const threshold = document.querySelector(
        '#background-color-threshold'
      ).valueAsNumber

      const hardness = document.querySelector(
        '#background-color-hardness'
      ).valueAsNumber

      warpedMapLayer.setRemoveColor({
        hexColor: color,
        threshold,
        hardness
      })
    }

    function setColorize() {
      const colorize = document.querySelector('#colorize').checked
      if (colorize) {
        const colorizeColor = document.querySelector('#colorize-color').value
        warpedMapLayer.setColorize(colorizeColor)
      } else {
        warpedMapLayer.resetColorize()
      }
    }

    document
      .querySelector('#background-color')
      .addEventListener('input', () => setRemoveColor())

    document
      .querySelector('#background-color-threshold')
      .addEventListener('input', () => setRemoveColor())

    document
      .querySelector('#background-color-hardness')
      .addEventListener('input', () => setRemoveColor())

    document
      .querySelector('#colorize')
      .addEventListener('input', () => setColorize())

    document
      .querySelector('#colorize-color')
      .addEventListener('input', () => setColorize())

    document.querySelector('#add-map').addEventListener('click', () => {
      if (handleAddMapClicked) {
        handleAddMapClicked()
      }
    })

    // Toggle the opacity using the 'Space' key
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        warpedMapLayer.setOpacity(0)
      }
    })

    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        warpedMapLayer.setOpacity(1)
      }
    })
  }
}
