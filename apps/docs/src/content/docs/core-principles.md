---
title: Core Principles
description: ''
---

## Principle I: Open data in, open data out

## Principle II: Light-weight, modular and interoperable

Allmaps consists of multiple loosely coupled components that can be used together but also function separately. These components include small core modules that do a single task, plugins for mapping libraries like [Leaflet](https://leafletjs.com/) and [OpenLayers](https://openlayers.org/), [MapLibre](https://maplibre.org/) and web applications that can be used by anyone. All components communicate through open standards and APIs, such as [Georeference Annotations](https://iiif.io/api/extension/georef/) and [IIIF resources](https://iiif.io/api/presentation/3.0/).

All web applications in the Allmaps ecosystem are static websites and function without a dedicated backend or GIS infrastructure. Although Allmaps provides ways to store metadata about georeferenced maps in the cloud, it’s also possible to work with files from your own computer and deploy the web applications on your own servers. Allmaps loads images directly from IIIF servers and makes no copies or derivatives of these images.

TODO:

- Allmaps does not require users to register or create an account.
- Easy to link to and share using URLs.
- In data principle:
  - Data is more important than software. Allmaps focuses on import and export tools.
  - The data produced with Allmaps should outlive the software components and should be useful in future projects.
- All modules and apps are open source and published on GitHub.
- Mention simplicity, Allmaps should never become a GIS editor

## Principle III: How is Allmaps organized?
