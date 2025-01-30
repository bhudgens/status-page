# GitHub-Powered Status Page

A modern, automated status page system powered by GitHub. This project leverages GitHub Issues, Actions, and Pages to provide a robust and easy-to-maintain status page solution.

## Features

- Automated status updates from GitHub Issues
- Real-time incident management
- 30+ day status history
- Mobile-responsive design
- Multi-system status tracking
- Automated builds and deployments

## Project Structure

```
.
├── .github/         # GitHub specific files (workflows, templates)
├── config/          # Configuration files
├── content/         # Hugo content files
├── layouts/         # Hugo layout templates
├── static/          # Static assets
└── docs/           # Generated site (for GitHub Pages)
```

## Setup

1. Install dependencies:
```bash
npm install
```

## Development

To build the site:
```bash
npm run build
```

This will generate the site in the `docs` directory, which is used for GitHub Pages. Note: While Hugo can be run directly with `hugo`, it's recommended to use `npm run build` to ensure the output goes to the correct directory.

## Contributing

[Documentation coming soon]
