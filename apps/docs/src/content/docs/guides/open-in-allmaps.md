---
title: Open in Allmaps
description: Add an Open in Allmaps button to your IIIF collection website.
---

Add an **Open in Allmaps** link to a map record on your website. Visitors
go to Allmaps Viewer if the map is georeferenced or Allmaps Editor if they
can georeference it. A manifest with at least one georeferenced map opens
in Allmaps Viewer.

Use a public IIIF Manifest URL, Image API service ID, or `info.json` URL.

## Add the button

URL-encode the IIIF URL and pass it as the `url` parameter. This keeps
characters such as `?` and `&` inside the IIIF URL.

```html
<a
  href="https://open.allmaps.org/?url=https%3A%2F%2Fexample.org%2Fiiif%2Fmanifest.json"
>
  Open in Allmaps
</a>
```

Replace the encoded example with your own URL. You can style the link to
match your site and translate the label for your audience.
