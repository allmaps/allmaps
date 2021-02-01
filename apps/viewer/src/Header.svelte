<script>
	import Banner from './Banner.svelte'
</script>

<Banner />
<header>
  <h1>
    <a href="/">
      <img alt="Allmaps"
        src="https://raw.githubusercontent.com/allmaps/style/master/allmaps-logo.svg" />
      <span>
        Allmaps viewer
      </span>
    </a>
  </h1>
  <a class="light" href="https://allmaps.org">Go to allmaps.org</a>
</header>

<style scoped>
header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  border-bottom-color: rgba(0, 0, 0, 0.5);
  border-bottom-style: solid;
  border-bottom-width: 1px;

  padding: 0.5em;
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
  width: 1.8em;
}

h1 a span {
  margin-left: 0.5em;
}


</style>