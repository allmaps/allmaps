<script>
	import { createEventDispatcher, onMount } from 'svelte'

  export let maps
  export let selectedMap

  let list
  let startX
  let scrollLeft
  let isDown = false
  let totalScrollDistance = 0
  let scrollThreshold = 5

  const dispatch = createEventDispatcher()

  function setSelectedMap (index) {
    if (totalScrollDistance <= scrollThreshold) {
      dispatch('update', {
        selectedMap: index
      })
    }
  }

  function thumbnailUrl (map) {
    const imageUri = map.imageService['@id']
    return `${imageUri}/full/100,100/0/default.jpg`
  }

  onMount(async () => {
    list.addEventListener('mousedown', (event) => {
      isDown = true
      totalScrollDistance = 0
      list.classList.add('active')
      startX = event.pageX - list.offsetLeft
      scrollLeft = list.scrollLeft
    })

    list.addEventListener('mouseleave', () => {
      isDown = false
      list.classList.remove('active')
    })

    list.addEventListener('mouseup', () => {
      isDown = false
      list.classList.remove('active')
    })

    list.addEventListener('mousemove', (event) => {
      if (!isDown) {
        return
      }

      event.preventDefault()
      const x = event.pageX - list.offsetLeft
      const scrollDistance = (x - startX)

      totalScrollDistance += Math.abs(scrollDistance)
      list.scrollLeft = scrollLeft - scrollDistance
    })
  })
</script>

<ol bind:this={list}>
	{#each maps as map, index}
		<li>
      <a role="button" href="#"
        class="{selectedMap === index ? 'selected' : ''}"
        on:click|preventDefault={() => setSelectedMap(index)}>
        <img alt={`Map ${index + 1}`} src={thumbnailUrl(map)} />
        <span class="index">{index + 1}</span>
		  </a>
    </li>
	{/each}
</ol>

<style>
ol {
  list-style-type: none;
  display: flex;
  flex-direction: row;
  overflow-x: hidden;
  margin: 0;
  padding: 5px;
  flex-shrink: 0;
}

li {
  margin: 5px;
  padding: 0;
  height: 100px;
  width: 100px;
  flex-shrink: 0;
}

li a {
  cursor: pointer;
  width: 100%;
  height: 100%;
  display: inline-block;
  position: relative;

}

li a.selected {
  border-style: solid;
  border-width: 2px;
}

li a > * {
  top: 0;
  position: absolute;
  width: 100%;
  height: 100%;
}

li a img {
  object-fit: cover;
}

li a .index {
  padding: 0.5em;
  text-shadow: 0 0 2px white;
}
</style>