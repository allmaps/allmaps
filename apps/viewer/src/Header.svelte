<script>
  export let inline = false
</script>

<header class:absolute="{!inline}">
  <h1>
    <a href="/">
      <img alt="Allmaps"
        src="https://raw.githubusercontent.com/allmaps/style/master/images/allmaps-logo.svg" />
      {#if inline}
      <span>
        Allmaps viewer
      </span>
      {/if}
    </a>
  </h1>
</header>

<style scoped>
header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  padding: 0.5em;
}

.absolute {
  z-index: 35;
  top: 0;
  position: absolute;
}

h1 {
  font-size: 100%;
  font-weight: normal;
  margin: 0;
}

h1 a {
  display: flex;
  flex-direction: row;
  align-items: center;
}

h1 a img {
  width: 40px;
}

h1 a span {
  margin-left: 0.5em;
}


</style>