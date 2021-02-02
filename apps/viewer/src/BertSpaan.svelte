<script>
	export let width = '150px'
</script>

<!-- Made with: -->
<!-- https://grid.layoutit.com/?id=Emp0dH3 -->
<a href="https://bertspaan.nl"
  class="grid-container" style="--width: {width}">
  <span class="B">B</span>
  <span class="E">e</span>
  <span class="R">r</span>
  <span class="T">t</span>

  <span class="S">S</span>
  <span class="P">p</span>
  <span class="A1">a</span>
  <span class="A2">a</span>
  <span class="N">n</span>
</a>

<style scoped>
.grid-container {
  text-decoration: none;
  text-transform: uppercase;
  font-weight: bold;
  line-height: 1em;

  width: var(--width);
  height: calc(var(--width) * 0.6);

  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 0px 0px;
  grid-template-areas:
    ". E R T ."
    "B S P A2 N"
    ". . A1 . .";
}

.E, .S, .T, .A2 {
  position: relative;
  top: calc(100% / 3 + 0.3em);
}

.B { grid-area: B; }
.E { grid-area: E; }
.S { grid-area: S; }
.R { grid-area: R; }
.P { grid-area: P; }
.A1 { grid-area: A1; }
.T { grid-area: T; }
.A2 { grid-area: A2; }
.N { grid-area: N; }

.grid-container > * {
  align-self: center;
  margin: auto;
}
</style>