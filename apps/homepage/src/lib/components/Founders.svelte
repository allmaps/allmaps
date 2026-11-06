<script lang="ts">
  const bertImage =
    'https://files.allmaps.org/images/homepage/src/images/faces/bert/822a80a56f51.jpg'
  const julesImage =
    'https://files.allmaps.org/images/homepage/src/images/faces/jules/69f00f20b55c.jpg'
</script>

<div class="my-8">
  <p class="m-0!">
    Allmaps was founded in 2021 by
    <a href="https://bertspaan.nl">Bert Spaan</a>
    and
    <a href="https://www.tudelft.nl/en/staff/j.a.schoonman/">Jules Schoonman</a
    >. We love maps, but we can never find the maps we're looking for. We both
    think working with digitized maps is far too complicated. It should be
    easier and more fun!
  </p>
  <div class="mt-10 space-y-8">
    <article class="flex items-start gap-8" aria-label="Bert Spaan">
      <a
        href="https://bertspaan.nl"
        class="block shrink-0"
        aria-label="Bert Spaan’s website"
      >
        <img
          src={bertImage}
          class="m-0! size-14 rounded-2xl object-cover"
          alt="Bert Spaan"
        />
      </a>
      <p class="m-0! min-w-0">
        <strong>Bert Spaan</strong> is a freelance creative technologist and the lead
        developer of Allmaps.
      </p>
    </article>
    <article class="flex items-start gap-8" aria-label="Jules Schoonman">
      <a
        href="https://www.tudelft.nl/en/staff/j.a.schoonman/"
        class="block shrink-0"
        aria-label="Jules Schoonman’s homepage"
      >
        <img
          src={julesImage}
          class="m-0! size-14 rounded-2xl object-cover"
          alt="Jules Schoonman"
        />
      </a>
      <p class="m-0! min-w-0">
        <strong>Jules Schoonman</strong> is a digital curator at
        <a href="/partners#partner-tudelft"
          >Delft University of Technology Library</a
        >, a founding partner of Allmaps. He leads educational projects for
        Allmaps.
      </p>
    </article>
  </div>
</div>
