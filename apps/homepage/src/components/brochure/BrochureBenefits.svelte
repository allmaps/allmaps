<script lang="ts">
  import {
    Check as CheckIcon,
    FilePdf as FilePdfIcon,
    ArrowSquareOut as ArrowSquareOutIcon
  } from 'phosphor-svelte'

  import { MapMonster } from '@allmaps/ui'
  import { shades } from '@allmaps/tailwind'
</script>

{#snippet check()}
  <span
    class="text-green bg-green-100 border-green-200 border rounded-full size-6 print:size-5 p-1 inline-flex items-center justify-center aspect-square"
  >
    <CheckIcon size={16} weight="bold" />
  </span>
{/snippet}

<div
  class="flex flex-col lg:grid lg:grid-cols-2 print:grid print:grid-rows-1 print:grid-cols-2 gap-4 p-4 h-full"
>
  <div
    class="bg-pink/5 p-4 md:p-8 rounded-xl flex flex-col gap-4 justify-between"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-pink text-4xl">Benefits for IIIF Members</h3>
      <p>
        IIIF Consortium Members can support the maintenance and further
        development of Allmaps by becoming <strong>Allmaps Supporter</strong>
        or <strong>Allmaps Innovator</strong>. In exchange they obtain benefits
        that offer more control of their collections in Allmaps, ease
        integrations with collection portals, and include training and support.
      </p>
      <p>
        For more information about Allmaps and listed benefits visit the
        <a class="text-pink underline" href="iiif-partnership"
          >Allmaps homepage</a
        >, or contact Allmaps through
        <a href="mailto:hello@allmaps.org" class="text-pink underline"
          >hello@allmaps.org</a
        >
        or the
        <code>#allmaps</code>
        channel in the IIIF Slack. To indicate your interest in becoming Allmaps
        Supporter or Allmaps Innovator, reach out to the IIIF Consortium staff at
        <a href="mailto:staff@iiif.io" class="text-pink underline"
          >staff@iiif.io</a
        >.
      </p>
      <p class="print:hidden">
        If you want to print this website or attach it to an email, you can use
        this <a
          class="underline text-pink"
          href="https://files.allmaps.org/documents/allmaps-iiif-partnership.pdf"
          target="_blank"
          rel="noopener noreferrer"
          >PDF version<ArrowSquareOutIcon
            weight="bold"
            class="inline-flex items-center size-4 mx-0.5 relative"
          /></a
        >.
      </p>

      <p>
        <em>
          Allmaps Supporters and Allmaps Innovators can reconsider their
          contribution on a yearly basis. The partnership between IIIF and
          Allmaps runs for three subsequent years (2026–28) after which it will
          be evaluated by the IIIF Executive Committee before continuation.</em
        >
      </p>

      <p>
        <em>
          Benefits will be expanded on a yearly basis through the work sponsored
          by the Allmaps Innovators. For non-institutional members (without
          holdings), please contact the Allmaps team to discuss alternative
          benefits.
        </em>
      </p>
    </div>
    <div class="place-self-end">
      <MapMonster
        color="pink"
        mood="excited"
        speechBalloonBackgroundColor={shades.pink[4]}
        speechBalloonTextColor="#fff"
      >
        <p class="font-bold">
          Support Allmaps as part of your IIIF Membership!
        </p>
      </MapMonster>
    </div>
  </div>

  <div class="flex flex-col gap-4 h-full">
    <div
      class="p-4 md:p-8 print:p-4 bg-green/5 rounded-xl flex flex-col gap-4 border-green grow"
    >
      <div class="flex justify-between gap-4">
        <h3 class="text-green">Open source</h3>
        <div
          class="text-green bg-green-100 border-green-200 border rounded-full px-3 inline-flex items-center"
        >
          <span class="font-bold">Free</span>
        </div>
      </div>
      <ul
        class="m-0 p-0 list-none [&_li]:contents grid grid-cols-[min-content_1fr]
          [&_.short]:hidden [&_.short]:print:block [&_.long]:print:hidden
          gap-x-4 gap-y-2"
      >
        <li>
          {@render check()}
          <span class="short"
            >Georeference any IIIF map with <a
              class="text-green underline"
              href="https://editor.allmaps.org">Allmaps Editor</a
            ></span
          >
          <span class="long"
            ><strong>Georeference any IIIF map</strong> with
            <a class="text-green underline" href="https://editor.allmaps.org"
              >Allmaps Editor</a
            >.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >View georeferenced maps with <a
              href="https://viewer.allmaps.org"
              class="text-green underline">Allmaps Viewer</a
            ></span
          >
          <span class="long"
            >View georeferenced maps with <a
              href="https://viewer.allmaps.org"
              class="text-green underline">Allmaps Viewer</a
            > using Georeference Annotations.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Display georeferenced maps with our plugins for MapLibre,
            OpenLayers and Leaflet</span
          >
          <span class="long"
            >Display georeferenced maps on your own website with our plugins for <strong
              >MapLibre, OpenLayers and Leaflet.</strong
            ></span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Use our TypeScript modules in your own software</span
          >
          <span class="long"
            >Use our <strong>TypeScript modules</strong> such as
            <a
              class="text-green underline"
              href="https://github.com/allmaps/allmaps/tree/main/packages/transform"
              ><code>@allmaps/transform</code></a
            > in your own software.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Download open data that contain all maps georeferenced with Allmaps</span
          >
          <span class="long"
            ><strong>Download open data</strong> that contain all maps georeferenced
            with Allmaps.</span
          >
        </li>
      </ul>
    </div>
    <div
      class="p-4 md:p-8 print:p-4 bg-green/5 rounded-xl flex flex-col gap-4 border-green border grow"
    >
      <div class="flex justify-between gap-4">
        <h3 class="text-green">Allmaps Supporters</h3>
        <div
          class="text-green bg-green-100 border-green-200 border rounded-full px-3 inline-flex items-center"
        >
          <span><span class="font-bold">$2,000</span> per year</span>
        </div>
      </div>
      <ul
        class="m-0 p-0 list-none [&_li]:contents grid grid-cols-[min-content_1fr]
          [&_.short]:hidden [&_.short]:print:block [&_.long]:print:hidden
          gap-x-4 gap-y-2"
      >
        <li class="nth-2:bg-red">
          {@render check()}
          <span class="short">Add your collection to Allmaps</span>
          <span class="long">
            <strong>Add your collection of maps to Allmaps</strong>, where it
            can be georeferenced by staff and patrons in Allmaps Editor.
            Suggestions from your collection will appear on the landing page of
            Allmaps Editor.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">Keep track of georeferenced maps</span>
          <span class="long">
            <strong
              >Keep track of your maps that have been georeferenced with Allmaps</strong
            >. Through an API and
            <a class="text-green" href="https://latest.allmaps.org/"
              >Allmaps Latest</a
            > you can keep track of the crowd-sourced data in Allmaps, and export
            it to your own systems at any time.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">Custom flow for patrons</span>
          <span class="long">
            <strong>Offer a custom flow to your patrons</strong>. When visiting
            Allmaps through your institutional portal, the interface will
            include institutional branding and a backlink to your collections.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">“Open in Allmaps” button</span>
          <span class="long">
            <strong>“Open in Allmaps” button</strong>. A customizable component
            you can add to your collection interface to indicate if a map has
            been georeferenced, and to open the resource in different parts of
            Allmaps.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">Training and support</span>
          <span class="long">
            <strong>Training and support</strong>. Allmaps offers one in-person
            training as part of the IIIF Annual Conference and one remote
            training as part of the Online Meeting. Support is offered through
            the
            <code>#maps</code>
            and <code>#allmaps</code> channels in the IIIF Slack.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Access future benefits made possible by Allmaps Innovators</span
          >
          <span class="long">
            Access <strong>future benefits</strong> made possible by Allmaps Innovators
            such as Allmaps Explore for finding maps across institutions and Allmaps
            Curator for managing crowdsourcing projects.</span
          >
        </li>
      </ul>
    </div>
    <div
      class="p-4 md:p-8 print:p-4 bg-green/5 rounded-xl flex flex-col gap-4 border-green border-2 grow"
    >
      <div class="flex justify-between gap-4">
        <h3 class="text-green">Allmaps Innovators</h3>
        <div
          class="text-green bg-green-100 border-green-200 border rounded-full px-3 inline-flex items-center"
        >
          <span><span class="font-bold">$10,000</span> per year</span>
        </div>
      </div>
      <ul
        class="m-0 p-0 list-none [&_li]:contents grid grid-cols-[min-content_1fr]
          [&_.short]:hidden [&_.short]:print:block [&_.long]:print:hidden
          gap-x-4 gap-y-2"
      >
        <li>
          {@render check()}
          <span class="short">All Allmaps Supporter benefits</span>
          <span class="long"
            ><strong>All Allmaps Supporter benefits</strong></span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Support the development of new apps and features</span
          >
          <span class="long"
            >Support the development of <strong>new apps and features</strong> within
            the Allmaps ecosystem that will open up to other members and the world.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Join the Allmaps Advisory Board and set priorities for the roadmap</span
          >
          <span class="long"
            >Have a seat on the <strong>Allmaps Advisory Board</strong> and determine
            the annual roadmap in consultation with the Allmaps team.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">Obtain beta access and offer feedback</span>
          <span class="long"
            >Obtain <strong>beta access</strong> and offer feedback to new apps and
            features.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short"
            >Contribute to establishing a governance structure for Allmaps</span
          >
          <span class="long"
            >Contribute to establishing a <strong>governance</strong> structure for
            Allmaps.</span
          >
        </li>
        <li>
          {@render check()}
          <span class="short">Listed as partner on Allmaps homepage</span>
          <span class="long"
            >Listed as a partner on the Allmaps homepage with logo.</span
          >
        </li>
      </ul>
    </div>
  </div>
</div>
