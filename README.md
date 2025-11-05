# Thyme SDK

A monorepo containing the Thyme CLI tool and SDK for note-taking and
productivity.

## Overview

Thyme SDK is a modular TypeScript project consisting of:

- **`@bnhpio/thyme-cli`** - Command-line interface for creating and managing
  notes
- **`@bnhpio/thyme-sdk`** - Core SDK library for programmatic access to Thyme
  functionality

## Prerequisites

- **Node.js** >= 18
- **Bun** >= 1.2.19 (package manager)

## Installation

Install dependencies from the root:

```bash
bun install
```

## Usage

### CLI

The CLI provides a `note` command for creating notes:

```bash
# Create a new note
bun run packages/cli/src/index.ts new "My note content"
```

### SDK

Import and use the SDK in your TypeScript/JavaScript projects:

```typescript
import { squared } from "@bnhpio/thyme-sdk";

const result = squared(5); // 25
```

## Development

### Project Structure

```
thyme-sdk/
├── packages/
│   ├── cli/          # CLI package
│   └── sdk/          # SDK package
├── apps/             # Example applications
└── turbo.json        # Turborepo configuration
```

### Available Scripts

From the root directory:

- `bun run build` - Build all packages
- `bun run dev` - Build all packages in watch mode
- `bun run check-types` - Type-check all packages

### Package Scripts

Each package supports:

- `build` - Build the package
- `dev` - Build in watch mode
- `check` - Run Biome linter and formatter
- `format` - Format code with Biome
- `test` - Run tests with rstest

### Building

Build all packages:

```bash
bun run build
```

Build a specific package:

```bash
cd packages/cli
bun run build
```

### Development Mode

Run in watch mode for active development:

```bash
bun run dev
```

### Code Quality

The project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Format and lint all packages
cd packages/cli
bun run check
```

### Type Checking

Type-check all packages:

```bash
bun run check-types
```

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Turborepo** - High-performance monorepo build system
- **Bun** - Fast JavaScript runtime and package manager
- **Biome** - Fast formatter and linter
- **rslib** - Fast Rust-based TypeScript bundler
- **yargs** - CLI argument parsing

## Contributing

1. Ensure you're using Node.js >= 18 and Bun >= 1.2.19
2. Install dependencies: `bun install`
3. Make your changes
4. Run type checking: `bun run check-types`
5. Format and lint: `bun run check` (in package directories)
6. Build to verify: `bun run build`

## License

Private project - All rights reserved.
