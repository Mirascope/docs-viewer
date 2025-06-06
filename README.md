# Mirascope Standalone Docs Viewer

## Development

This is a fork of [mirascope/website](https://github.com/mirascope/website) which instantiates a standalone docs viewer.

The goal is to assist mirascope/mirascope development by allowing developing docs alongside the project without merging them into the main site.

For general information, see the mirascope/website repo. 

This is intended as dev-tooling only and not maintained at a level of production quality.

### Setup

This project uses [Bun](https://bun.sh/) - a fast all-in-one JavaScript runtime and toolkit.

```bash
# Install dependencies
bun install

# Start development server
bun run start --content-dir path/to/content
```


## License

Everything in this repository is licensed under the [MIT License](https://github.com/Mirascope/website/blob/main/LICENSE) except for "Williams-Handwriting-Regular-v1.tff", which is a closed license font and not available for use without express permission.
