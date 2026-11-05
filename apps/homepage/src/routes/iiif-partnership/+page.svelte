<script lang="ts">
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  import BrochurePage from '$lib/components/brochure/BrochurePage.svelte'
  import BrochureTitle from '$lib/components/brochure/BrochureTitle.svelte'
  import BrochureCards from '$lib/components/brochure/BrochureCards.svelte'
  import BrochureBenefits from '$lib/components/brochure/BrochureBenefits.svelte'
  import BrochureSection from '$lib/components/brochure/BrochureSection.svelte'
</script>

<svelte:head>
  <title>Allmaps - IIIF Partnership</title>
</svelte:head>

<main
  class="[&_section.brochure-page]:print:m-0 [&_section.brochure-page]:print:aspect-3/2 [&_section.brochure-page]:print:max-w-full [&_section.brochure-page]:print:overflow-hidden [&_section.brochure-section]:print:m-0 [&_section.brochure-section]:print:max-w-full"
>
  <BrochurePage>
    <BrochureTitle />
  </BrochurePage>

  <div class="mask-hero-content">
    <BrochurePage>
      <BrochureCards maskedMaps={data.maskedMaps} />
    </BrochurePage>

    <BrochurePage>
      <BrochureBenefits />
    </BrochurePage>

    <BrochureSection
      colorClasses="bg-blue/5 [&_h2]:text-blue [&_h3]:text-blue [&_h4]:text-blue [&_a]:text-blue"
    >
      <h2>Frequently Asked Questions</h2>

      <h3>Why Allmaps?</h3>
      <p>
        Digitized maps draw the interest of patrons. Maps are best found
        <em>by location</em> and preferably studied
        <em>in comparison to other maps</em>. While many collections include
        maps, few institutions have the in-house GIS expertise required to
        improve their accessibility.
      </p>
      <p>
        Allmaps is <em>IIIF-first</em> and does not require specific infrastructure
        or expertise to turn digitized images into interactive maps. In fact, patrons
        are encouraged to do this by themselves. The only institutional requirement
        is the IIIF Image API, and, preferably, the IIIF Presentation API.
      </p>
      <p>
        Since Allmaps only generates lightweight annotations and no heavy
        derivatives, it becomes much easier to share maps and to create
        collective portals to search across collections. For advanced use cases,
        it offers tooling to analyse and compare maps, or to import them into
        GIS applications.
      </p>
      <p>
        Alternative options rely on expert knowledge, generate derivatives, are
        closed source, or do not grant access to data. But supporting Allmaps is
        by no means exclusive and can be complemented with other workflows
        depending on institutional needs to patrons’ preferences.
      </p>
      <p>
        Allmaps is purposefully not called a platform, since platforms are easy
        to jump on but difficult to jump off. By focusing on modularity and data
        sovereignty, Allmaps has been developed as an open and extendable
        ecosystem.
      </p>

      <h3>What is georeferencing?</h3>
      <p>
        Georeferencing relates a couple of points (pixels) in an image to
        geospatial coordinates. These are called <em>ground control points</em>,
        or GCPs. The process often also includes cropping the image to the part
        containing the map. This is called the <em>mask</em>.
      </p>
      <p>
        Based on three or more control points, it’s possible to compute all the
        other points in the image. This can be used to convert between pixels
        and geospatial coordinates.
      </p>
      <p>
        Georeferencing usually results in new versions (or derivatives) of the
        original image. Allmaps stores the control points and mask in a
        light-weight and standardized Web Annotation, and produces derivatives
        on the fly.
      </p>

      <h3>Why the IIIF-Allmaps Partnership?</h3>
      <p>
        One of the benefits of IIIF is the ability to share codebases across
        implementations. Over the past ten years many open source tools
        developed by institutions and commercial partners have seen uptake
        within the IIIF Community at large. The sustainability of such tools has
        often been a challenge. Through the introduction of membership top-ups,
        the IIIF Consortium aims to play a more active role in organizing
        durable support for open source projects that benefit the community. It
        also promotes IIIF membership by offering dedicated services in return.
      </p>
      <p>
        For Allmaps, the partnership marks the start of a new phase. While the
        project has been generously supported by various institutions through a
        series of grants, structural maintenance has been a concern as more and
        more institutions and individuals rely on the ecosystem. Securing its
        open source and open data character, the Allmaps team is keen on
        developing a funding structure that offers dedicated services to
        partners without compromising its core values and creating too much
        overhead. The partnership with the IIIF Consortium is the logical
        outcome of this process.
      </p>

      <h3>How is Allmaps organized?</h3>
      <p>
        Allmaps is a collaboration between Delft University of Technology
        Library and independent developer and cartographer Bert Spaan; both
        based in the Netherlands. Institutional partners and independent
        contractors have significantly contributed since its founding in 2021.
        Allmaps is currently establishing a legal entity for its maintenance and
        further development, while preserving the commitment to open data and
        open source. This process is monitored by the Allmaps Advisory Board
        which will also represent the interests of other IIIF Consortium
        members.
      </p>
      <p>
        The Advisory Board is the first step in formalizing the governance
        structure of Allmaps, and will be filled with single representatives
        from each Innovator, Glen Robson from the IIIF Consortium, Jules
        Schoonman from TU Delft, and Bert Spaan. The board will also include
        representatives from other long-term institutional partners of Allmaps
        who are not (yet) members of the IIIF Consortium. The Advisory Board
        will meet twice annually.
      </p>

      <h3>What’s on the Allmaps roadmap?</h3>
      <p>
        Allmaps has just released a new version of Allmaps Editor. The following
        items and more are on the roadmap for the coming years:
      </p>
      <ul>
        <li>
          A new version of
          <strong
            ><a href={toolIdentities.viewer.href}>Allmaps Viewer</a></strong
          >
          with an improved background map and advanced functionality for analyzing
          and comparing maps.
        </li>
        <li>
          Support for <strong>version history</strong> of georeferenced maps and to
          pin a specific version.
        </li>
        <li>
          <strong>Institutional accounts</strong> with API access that can be used
          to ingest and patch annotations, and to tag versions.
        </li>
        <li>
          A new application called <strong>Allmaps Curator</strong> that can be used
          to create collections of maps and set up crowdsourcing projects with groups
          of people.
        </li>
        <li>
          A new application called <strong>Allmaps Explore</strong> through which
          all georeferenced maps in the Allmaps database can be explored and reused.
        </li>
        <li>
          A customizable version of the
          <strong
            ><a href={toolIdentities.arcade.href}>Allmaps Arcade</a></strong
          >
          game.
        </li>
        <li>
          A template for creating <strong>slideshows</strong> with Allmaps.
        </li>
      </ul>

      <h3>Which licenses are used by Allmaps?</h3>
      <p>
        Applications use the
        <a href="https://www.gnu.org/licenses/gpl-3.0.html">GNU GPLv3 license</a
        >; packages use the
        <a href="https://en.wikipedia.org/wiki/MIT_License">MIT License</a>. All
        Georeference Annotations generated through Allmaps Editor or otherwise
        added to the Allmaps database are licensed as
        <a href="https://creativecommons.org/public-domain/cc0/"
          >CC0 (public domain)</a
        >
        and published daily as an open dataset. The Allmaps open source packages can
        be used independently of Allmaps’ infrastructure, i.e. it’s possible to host
        your own annotations using different licenses.
      </p>
    </BrochureSection>

    <BrochureSection
      colorClasses="bg-pink/5 [&_h2]:text-pink [&_h3]:text-pink [&_h4]:text-pink [&_a]:text-pink"
    >
      <h2>Further reading</h2>
      <p>
        A selection of links to articles about Allmaps and recorded
        presentations:
      </p>
      <ul>
        <li>
          <a
            href="https://www.tandfonline.com/doi/full/10.1080/15420353.2025.2574896"
            >The Social Life of Allmaps: Reflecting on Software Communities in
            Sustaining the Digital Geohumanities</a
          >
          (Journal of Map & Geography Libraries, 2025)
        </li>
        <li>
          <a href="https://youtu.be/m--5dKG2Bq0">Teaching With Allmaps</a> (2025 IIIF
          Annual Conference)
        </li>
        <li>
          <a
            href="https://youtube.com/playlist?list=PLIXSt4zVrYDzTkxJJGK9hxHEZgorBMl_l&si=Pm8Zooen2QaGDEKZ"
            >Allmaps Public Convening</a
          >
          (Leventhal Map & Education Center, 2024)
        </li>
        <li>
          <a
            href="https://www.tudelft.nl/en/2024/library/allmaps-makes-it-easier-to-find-old-maps-and-use-them-in-research"
            >Allmaps makes it easier to find old maps and use them in research</a
          >
          (TU Delft, 2024)
        </li>
        <li>
          <a href="https://www.leventhalmap.org/articles/bert-spaan-interview/"
            >All the maps, all the time: an interview with Bert Spaan</a
          >
          (Leventhal Map & Education Center, 2022)
        </li>
      </ul>

      <h2>Acknowledgements</h2>
      <p>
        The partnership between Allmaps and the IIIF Consortium grew out of a
        series of informal discussions and meetings held during the
        <a href="https://openmapsmeeting.nl/">Open Maps Meeting</a> (The Hague,
        November 2024),
        <a href="https://lmec-ws.observablehq.cloud/allmaps-news/2024-convening"
          >Allmaps Public Convening</a
        >
        (Boston and online, November 2024),
        <a href="https://davidrumseymapcenter.github.io/colocate/"
          >Colocate2 Unconference</a
        >
        (Stanford, February 2025) and the
        <a href="https://iiif.io/event/2025/leeds/">IIIF Annual Conference</a>
        (Leeds, June 2025).
      </p>
      <p>
        The importance of the Allmaps-IIIF partnership was underscored after the
        <a
          href="https://www.leventhalmap.org/articles/neh-allmaps-statement-2025/"
          >termination</a
        >
        of a National Endowment for the Humanities grant on April 17, 2025 that had
        been awarded to the Leventhal Map & Education Center and the American Geographical
        Society Library for the further development of Allmaps. The grant included
        the creation of a Consortium for Public Geography in support of the long-term
        maintenance and governance of the tools. Building on this idea, an Allmaps
        Planning group consisting of representatives from the IIIF Consortium staff,
        Executive Committee, Maps Community Group, Allmaps, LMEC and AGSL has held
        regular meetings to work out the structure of the partnership. It was approved
        by the Executive Committee in October 2025.
      </p>
      <p>
        Funds to create the initial benefits for Allmaps Supporters were
        generously made available by the Beinecke Rare Book & Manuscript Library
        at Yale Library and Delft University of Technology Library.
      </p>
    </BrochureSection>
  </div>
</main>

<style>
  @media print {
    @page {
      size: 30cm 20cm;
      margin: 0;
    }
  }
</style>
