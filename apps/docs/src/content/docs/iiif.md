---
title: What is IIIF?
description: 'Explanation of the open standards used by Allmaps'
---

IIIF—the [International Image Interoperability Framework](https://iiif.io/),
pronounced “Triple-Eye-Eff”—provides open standards for sharing digital
collections. Libraries, archives, and museums use IIIF to make images and
information about their collections available through a common set of APIs.

This lets applications such as Allmaps work with maps from many institutions.
Each institution hosts its own images, while IIIF provides a shared way to
access them.

You don’t need to understand the technical details to use Allmaps, but two
IIIF APIs and a few terms are useful to know.

## IIIF Presentation API

The Presentation API describes digital objects and how their parts fit together:

- A **Manifest** is a JSON document describing an object, such as a map or an
  atlas. It includes descriptive information and an ordered sequence of Canvases.
- A **Canvas** is a virtual surface representing a page or view of that object.
  A single-sheet map might have one Canvas; an atlas might have one for each page.
- An **Annotation** connects content to a Canvas. A *painting annotation*
  specifies the image to display on it. Other annotations can add information,
  such as comments or transcriptions.

See the [IIIF Presentation API documentation](https://iiif.io/api/presentation/3.0/)
for more detail.

## IIIF Image API

The Image API lets applications request an entire image or a region of it at
a particular size, rotation, quality, and format. This makes it possible to
explore large images without downloading the full-resolution image at once.

Image requests follow this pattern:

`[image service base URL]/[region]/[size]/[rotation]/[quality].[format]`

The examples below use a [map of Delfland](https://annotations.allmaps.org/images/2aa3bde6bcae3817). Click a URL suffix to open the requested image.

<div class="not-content overflow-x-auto border border-[var(--sl-color-gray-5)]">
  <table class="w-full table-fixed border-collapse text-left text-sm">
    <thead class="border-b border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg-sidebar)]">
      <tr>
        <th scope="col" class="w-24 px-3 py-2 font-semibold sm:w-40">Preview</th>
        <th scope="col" class="px-3 py-2 font-semibold">Request</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-[var(--sl-color-gray-5)] last:border-b-0">
        <td class="w-24 p-3 align-top sm:w-40">
          <img
            class="m-0 h-auto w-20 max-w-full sm:w-32"
            src="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/full/400,/0/default.jpg"
            alt="Full historical map of Delfland"
            width="400"
            height="347"
            loading="lazy"
          />
        </td>
        <td class="p-3 align-top">
          <div class="flex flex-col gap-3 leading-snug">
            <strong class="block text-base">Full map</strong>
            <p class="m-0">The entire image, scaled to 400 pixels wide.</p>
            <a class="block break-words text-[var(--sl-color-text-accent)] underline underline-offset-2" href="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/full/400,/0/default.jpg">
              <code class="text-xs">/full/<wbr>400,/<wbr>0/<wbr>default.jpg</code>
            </a>
          </div>
        </td>
      </tr>
      <tr class="border-b border-[var(--sl-color-gray-5)] last:border-b-0">
        <td class="w-24 p-3 align-top sm:w-40">
          <img
            class="m-0 h-auto w-20 max-w-full sm:w-32"
            src="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/4316,4389,1557,1557/400,/0/default.jpg"
            alt="Detail of the Delfland map"
            width="400"
            height="400"
            loading="lazy"
          />
        </td>
        <td class="p-3 align-top">
          <div class="flex flex-col gap-3 leading-snug">
            <strong class="block text-base">Map detail</strong>
            <p class="m-0">A 1557 × 1557 pixel region starting at (4316, 4389), scaled to 400 pixels wide.</p>
            <a class="block break-words text-[var(--sl-color-text-accent)] underline underline-offset-2" href="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/4316,4389,1557,1557/400,/0/default.jpg">
              <code class="text-xs">/4316,4389,1557,1557/<wbr>400,/<wbr>0/<wbr>default.jpg</code>
            </a>
          </div>
        </td>
      </tr>
      <tr class="border-b border-[var(--sl-color-gray-5)] last:border-b-0">
        <td class="w-24 p-3 align-top sm:w-40">
          <img
            class="m-0 h-auto w-20 max-w-full sm:w-32"
            src="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/200,/0/default.jpg"
            alt="Upper-left corner of the Delfland map"
            width="200"
            height="200"
            loading="lazy"
          />
        </td>
        <td class="p-3 align-top">
          <div class="flex flex-col gap-3 leading-snug">
            <strong class="block text-base">Upper-left corner</strong>
            <p class="m-0">A 1000 × 1000 pixel region starting at (0, 0), scaled to 200 pixels wide.</p>
            <a class="block break-words text-[var(--sl-color-text-accent)] underline underline-offset-2" href="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/200,/0/default.jpg">
              <code class="text-xs">/0,0,1000,1000/<wbr>200,/<wbr>0/<wbr>default.jpg</code>
            </a>
          </div>
        </td>
      </tr>
      <tr class="border-b border-[var(--sl-color-gray-5)] last:border-b-0">
        <td class="w-24 p-3 align-top sm:w-40">
          <img
            class="m-0 h-auto w-20 max-w-full sm:w-32"
            src="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/200,/90/default.jpg"
            alt="Upper-left corner of the Delfland map rotated 90 degrees clockwise"
            width="200"
            height="200"
            loading="lazy"
          />
        </td>
        <td class="p-3 align-top">
          <div class="flex flex-col gap-3 leading-snug">
            <strong class="block text-base">Rotated corner</strong>
            <p class="m-0">The same region and size, rotated 90° clockwise.</p>
            <a class="block break-words text-[var(--sl-color-text-accent)] underline underline-offset-2" href="https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/200,/90/default.jpg">
              <code class="text-xs">/0,0,1000,1000/<wbr>200,/<wbr>90/<wbr>default.jpg</code>
            </a>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

Each image service also provides an
[`info.json`](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/info.json)
document describing the image’s dimensions and the service’s capabilities,
including available tile sizes and scale factors. Supported features vary
between services.

See the [IIIF Image API documentation](https://iiif.io/api/image/3.0/)
for more detail.
