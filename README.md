# Mirascope Standalone Docs Viewer

## Development

This is a fork of [mirascope/website](https://github.com/mirascope/website) which instantiates a standalone docs viewer.

The goal is to assist mirascope/mirascope development by allowing developing docs alongside the project without merging them into the main site.

For general information, see the mirascope/website repo.

This is intended as dev-tooling only and not maintained at a level of production quality.

## Setup

This project uses [Bun](https://bun.sh/) - a fast all-in-one JavaScript runtime and toolkit.

```bash
# Install dependencies
bun install

# Start development server
bun run start --content-dir path/to/content
```

## Usage

The project is currently used in the mirascope v2 repo with a package json like this:

```json
{
  "name": "mirascope",
  "private": true,
  "scripts": {
    "preprocess": "DOCS_VIEWER_DIR=node_modules/@mirascope/docs-viewer bun node_modules/@mirascope/docs-viewer/scripts/preprocess-content.ts --content-dir mirascope/experimental/v2",
    "start": "DOCS_VIEWER_DIR=node_modules/@mirascope/docs-viewer bun node_modules/@mirascope/docs-viewer/scripts/start.ts --content-dir mirascope/experimental/v2",
  },
  "devDependencies": {
    "@mirascope/docs-viewer": "^0.1.5",
  }
}
```

## Upcoming Development

I want to figure out how to integrate the api generation to produce up-to-date api docs for mirascope v2.

## License

Everything in this repository is licensed under the [MIT License](https://github.com/Mirascope/website/blob/main/LICENSE) except for "Williams-Handwriting-Regular-v1.tff", which is a closed license font and not available for use without express permission.
