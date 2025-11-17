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
    class="text-green bg-green-100 border-green-200 border rounded-full size-6 p-1 inline-flex items-center justify-center aspect-square"
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
      <p>
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
          Allmaps runs for three subsequent years (2026-28) after which it will
          be evaluated by the IIIF Executive Committee before continuation.</em
        >
      </p>

      <p>
        <em>
          These benefits will be expanded on a yearly basis through the work
          sponsored by the Allmaps Innovators. For non-institutional members
          (without holdings), please contact the Allmaps team to discuss
          alternative benefits.
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

  <div class="bg-green/5 p-4 md:p-8 rounded-xl">
    <table class="min-w-full text-left border-collapse table-fixed">
      <thead class="text-green">
        <tr
          class="[&_th]:p-2 [&_th]:align-bottom [&_th]:border-b-green-500 [&_th]:border-b-2 text-green font-bold"
        >
          <th>Features</th>
          <th class="text-center w-24">All</th>
          <th class="text-center w-24">Allmaps Supporter</th>
          <th class="text-center w-24">Allmaps Innovator</th>
        </tr>
      </thead>
      <tbody class="[&_td]:p-2">
        <tr>
          <td
            >Allmaps Editor, Allmaps Viewer and other apps & TypeScript modules</td
          >
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Add your collection to Allmaps</td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Keep track of georeferenced maps</td>
          <td></td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Custom flow for patrons</td>
          <td></td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Open in Allmaps button</td>
          <td></td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Training and support</td>
          <td></td>
          <td class="text-center">{@render check()}</td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Support the development of new apps and features</td>
          <td></td>
          <td></td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td
            >Join the Allmaps Advisory Board and set priorities for the roadmap</td
          >
          <td></td>
          <td></td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Obtain beta access and offer feedback</td>
          <td></td>
          <td></td>
          <td class="text-center">{@render check()}</td>
        </tr>
        <tr>
          <td>Listed as partner on Allmaps homepage</td>
          <td></td>
          <td></td>
          <td class="text-center">{@render check()}</td>
        </tr>

        <tr
          class="[&_td]:p-2 [&_td]:bg-green-100 [&_td]:border-t-green-500 [&_td]:border-t-2 text-green font-bold"
        >
          <td class="rounded-bl-lg">Annual fee</td>
          <td></td>
          <td class="text-center">$2,000</td>
          <td class="rounded-br-lg text-center">$10,000</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- * **Add your collection of maps to Allmaps**, where it can be georeferenced by staff and patrons in Allmaps Editor. Suggestions from your collection will appear on the Editor’s landing page;
* **Keep track of your maps that have been georeferenced with Allmaps**. Through an API and Allmaps Latest you can keep track of the crowd-sourced data in Allmaps, and export it to your own systems at any time;
* **Offer a custom flow to your patrons**. When visiting Allmaps through your institutional portal, the interface will include institutional branding and a backlink to your collections;
* **“Open in Allmaps” button**. A customizable component you can add to your collection interface to indicate if a map has been georeferenced, and to open the resource in different parts of Allmaps;
* **Training and support**. Allmaps offers one in-person training as part of the IIIF Annual Conference and one remote training as part of the Online Meeting. Support is offered through the \#maps and \#allmaps channels in the IIIF Slack;
* Enjoy **future benefits** made possible by Allmaps Innovators such as Allmaps Explore for finding maps across institutions and Allmaps Curator for managing crowdsourcing projects.

An **Allmaps Innovator** pays $10,000 on top of their annual IIIF membership fee and receives the same benefits as Allmaps Supporters, plus:

* Support the development of **new apps and features** within the Allmaps ecosystem that will open up to other members and the world;
* Have a seat on the **Allmaps Advisory Board** and determine the annual roadmap in consultation with the Allmaps team;
* Obtain **beta access** and offer feedback to new apps and features;
* Contribute to establishing a **governance** structure for Allmaps;
* Listed as a partner on the Allmaps homepage with logo. -->
