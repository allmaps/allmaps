function initializeControls(
  controlsHtmlUrl,
  warpedMapLayer,
  handleAddMapClicked,
  map,
  ol
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

    function setProjection(event) {
      // Change OL projection
      onChangeProjection(event)

      // WarpedMapLayer projection should then be triggered by render()
    }

    // from https://openlayers.org/en/latest/examples/projection-and-scale.html
    function onChangeProjection(event) {
      const currentView = map.getView()
      const currentProjection = currentView.getProjection()
      const newProjection = ol.proj.get(event.target.value)
      const currentResolution = currentView.getResolution()
      const currentCenter = currentView.getCenter()
      const currentRotation = currentView.getRotation()
      const newCenter = ol.proj.transform(
        currentCenter,
        currentProjection,
        newProjection
      )
      const currentMPU = currentProjection.getMetersPerUnit()
      const newMPU = newProjection.getMetersPerUnit()
      const currentPointResolution =
        ol.proj.getPointResolution(
          currentProjection,
          1 / currentMPU,
          currentCenter,
          'm'
        ) * currentMPU
      const newPointResolution =
        ol.proj.getPointResolution(newProjection, 1 / newMPU, newCenter, 'm') *
        newMPU
      const newResolution =
        (currentResolution * currentPointResolution) / newPointResolution
      const newView = new ol.View({
        center: newCenter,
        resolution: newResolution,
        rotation: currentRotation,
        projection: newProjection
      })
      map.setView(newView)
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

    document
      .querySelector('#projection')
      .addEventListener('change', (event) => setProjection(event))

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
