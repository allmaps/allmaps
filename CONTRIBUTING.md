# Contributing to Allmaps

Allmaps is an open source project, so we encourage you to contribute!

If this is your first time contributing to an open source project, here's a good website to read about [how to contribute to open source](https://opensource.guide/how-to-contribute/). If words like 'Issues' and Pull Requests' are familiar to you, read on.

## Get involved

There are many ways to contribute to Allmaps, and many of them don't involve writing any code. Here's a few ideas to get started:

- Simply start using Allmaps! Go through the [Get Started](https://allmaps.org/#getting-started) guide and play around. Just by creating new annotations, you're already helping a lot.
- Our documentation is still growing. If you need more documentation about a topic, or if you've written your own documentation, notes or tutorial and you'd like to share it with us, please let us know!
- Take a look at the [discussions](https://github.com/allmaps/allmaps/discussions), where you'll find feature requests and development ideas. You can open a new discussion to [share your ideas](https://github.com/allmaps/allmaps/discussions/new/choose) with us. We gather small feature requests in pinned discussions. When we start working on a bunch of ideas, we plan that work for the coming months in the Projects tab where you'll find the [Roadmap](https://github.com/orgs/allmaps/projects/3).
- You found something that's not working as expected? Let us know about the bug you found by [opening an issue](https://github.com/allmaps/allmaps/issues/new/choose).
- If you find an issue you would like to fix, [open a pull request](#pull-requests). A good starting point would be issues tagged [good first issue](https://github.com/allmaps/allmaps/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).

Contributions are very welcome. If you think you need help with your contribution, you can ask us questions in the discussions [Q&A](https://github.com/allmaps/allmaps/discussions/categories/q-a) or reach out via email and let us know you are looking for a bit of help.

## Pull requests

Here are the steps to follow when opening a [pull request](https://github.com/allmaps/allmaps/pulls). If you've never sent a GitHub pull request before, you can learn how from [this free video series](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github).

- Fork the repository (as explained in the [Readme](./README.md))
- Create a new branch from `develop`
- Make your changes to a specific package or app
- Add tests and check they are passing by running `pnpm run test` in your package or app
- If you've changed APIs, update the documentation and run `pnpm run documentation` before committing
- Commit your changes, which will fire pre-commit and check for types, tests and linting on all packages and apps
- Send us your pull request (opened against the `develop` branch)
