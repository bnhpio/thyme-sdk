# Thyme SDK & CLI

A clean, modern toolkit for building and deploying Web3 automation tasks.

## Packages

- **[@thyme-sh/sdk](./packages/sdk)** - SDK for authoring Web3 tasks
- **[@thyme-sh/cli](./packages/cli)** - CLI for local development and deployment

## Quick Start

```bash
# Install CLI globally
npm install -g @thyme-sh/cli

# Create new project
thyme init my-project

# Create a task
cd my-project
thyme new my-task

# Run locally
thyme run my-task

# Simulate on-chain
thyme run my-task --simulate

# Deploy to cloud
thyme login
thyme upload my-task
```

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Format code
bun run format
```

## License

MIT
