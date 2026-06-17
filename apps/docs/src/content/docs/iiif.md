---
title: What is IIIF?
description: ''
---

Allmaps is based on the [International Image Interoperability Framework](https://iiif.io/) (IIIF, pronounced as "Triple-Eye-Eff"), a set of standards that have been implemented by libraries, archives and museums around the world to open up their digital collections for reuse.

While each institution maintains its own digital infrastructure, IIIF offers Application Programming Interfaces (APIs) for accessing complex digital objects such as books, journals and maps across institutions. These APIs provide details about the structure of objects, their metadata and digital assets.

IIIF allows developers to make software that can be used to interact with numerous digital collections all at once–without the need to study the technical documentation or request permission for every individual institution. For example, the vast digital collections of the Library of Congress, Bibliothèque Nationale de France and Staatsbibliothek Berlin can all be accessed through the same protocols.

When using Allmaps, you don't need to know the specifics of IIIF, but it can be useful to learn about its terminology, which is described concisely below, with links to the respective documentation.

<!-- The standards of IIIF are maintained by an active international consortium.  -->

### IIIF Presentation API

A IIIF Presentation Manifest is a [JSON-LD](https://json-ld.org/) document that describes a compound digital object. Following Linked Open Data principles, it has a unique identifier (usually the URL where it can be found on the web) and a “context” that explains how to read the document.

A IIIF Manifest is composed of one or more Canvasses. Not unlike a painterly canvas, this is defined as a rectangular surface with fixed dimensions on which other elements are added. These elements are called Annotations. A book, for example, consists of an ordered list of Canvases, on each of which the digitized page is “annotated”.

Annotations are broadly used within IIIF and have different reasons or _motivations_. While image annotations have a “painting” motivation, other motivations include “describing”, “transcribing”, “commenting”, and, importantly in this context, “georeferencing”. Each of the non-painting motivations add additional information to the canvas (and, by extension, to the image painted on the canvas). This can be transcribed text, information about who is depicted in a photograph or personal comments about a work.

For more information, please consult the [documentation](https://iiif.io/api/presentation/3.0/) of the IIIF Presentation API.

### IIIF Image API

While images painted on a canvas can be simple, static images (with a fixed size), this does not work well for high resolution images that are too large to download all at once. For this purpose the IIIF Image API was developed. It offers a URL-scheme to request specific regions of images at various sizes, rotations and qualities. Take a look at these examples to become familiar with the scheme:

- Base URL: https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236
- Full image at 1000px: [/full/1000,/0/default.jpg](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/full/1000,/0/default.jpg)
- Part of the image: [/4316,4389,1557,890/1557,890/0/default.jpg](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/4316,4389,1557,890/1557,890/0/default.jpg)
- Upper left corner of the image: [/0,0,1000,1000/500,500/0/default.jpg](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/500,500/0/default.jpg)
- Rotated image: [/0,0,1000,1000/500,500/90/default.jpg](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/0,0,1000,1000/500,500/90/default.jpg)
- Full image (8662 x 7519 pixels): [/full/full/0/default.jpg](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/full/full/0/default.jpg)
- URL scheme: \[base url\]/\[region\]/\[size\]/\[rotation\]/\[quality\].\[format\]
- Not all IIIF-servers support the same functionalities\! The level of support is described in an [info.json](https://dlc.services/iiif-img/7/4/0b0af56c-d836-4fe4-a9da-7ed66ea7a236/info.json) file.

Servers often cache or pregenerate tiles at various zoom levels. An interactive demonstration of these tile sets can be found in [this Notebook](https://observablehq.com/d/31f4cd9ccc223a57).

For more information, please consult the documentation of the [IIIF Image API](https://iiif.io/api/image/3.0/).
