---
title: Allmaps Docs
description: Examples, API documentation, and package documentation for Allmaps
---

_This is the documentation site of Allmaps. Looking for the homepage? Go to [allmaps.org](https://allmaps.org/)_

## Introduction

Allmaps is an ecosystem for working with digitized maps. It aims to open up the wealth of digitized map collections of libraries, archives and museums around the world. By offering accessible and web-based tooling for viewing, exploring and georeferencing maps, it bridges the world of cultural heritage and professional GIS. Through its focus on open source, open standards and open data, it guarantees interoperability, supports self-hosted infrastructure and encourages long-term data preservation.

Importantly, Allmaps _does not_ store images depicting maps; only Web Annotations with extra information about such images, hosted by institutions or other parties. It is thus an example of centralized tooling based on federated infrastructures. There's no data or even software lock-in: through Allmaps' many open source modules you are able to independently set up your own infrastructure.

Technically, Allmaps consists of multiple loosely coupled components that can be used together but also function separately. These components include small core modules that do a single task, plugins for mapping libraries like [Leaflet](https://leafletjs.com/) and [OpenLayers](https://openlayers.org/), [MapLibre](https://maplibre.org/) and web applications that can be used by anyone. All components communicate through open standards and APIs, such as [Georeference Annotations](https://iiif.io/api/extension/georef/) and [IIIF resources](https://iiif.io/api/presentation/3.0/).

## Documentation

This documentation consists of the following four parts:

- Information about the [IIIF standards](/iiif) used. Knowledge about these standards is not a hard requirement for using Allmaps, but it can help to better understand some of the language used throughout the ecosystem, and understand how it depends on content providers.
- User guides for interacting with the web interfaces. These guides explain how to use Allmaps Viewer and Allmaps Editor, how to import to and export from Allmaps, and how to open resources in Allmaps by finding the IIIF URL. These guide can be used indivudually or by groups, for example in a classroom setting or workshop.
- Documentation for the JavaScript [packages](/packages) and [APIs](/api). This is aimed at developers who want to integrate Allmaps into their own projects or partner institutions who are integrating with Allmaps. Most of this documentation is generated from the respective READMEs of the packages.
- Implementation [examples](/examples) _(work in progress)_. Examples awaiting to be transferred here from the Observable plaform.

## Get in touch

If the documentation is not clear to you, if you like to contribute or have other questions, please contact Allmaps by email or the IIIF Slack.
