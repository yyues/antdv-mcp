# Ant Design Vue MCP

A Model Context Protocol (MCP) server for Ant Design Vue documentation with an indexer CLI. This project provides structured access to Ant Design Vue component documentation (v3 and v4) through MCP tools, enabling AI assistants to query component APIs, search documentation, and provide accurate information.

Chinese documentation: [README.zh-CN.md](./README.zh-CN.md)

## Features

- 📚 **Documentation Indexer**: Crawls and indexes Ant Design Vue v3 and v4 documentation
- 🔍 **Full-Text Search**: SQLite FTS5-powered search across pages and API items
- 🛠️ **MCP Tools**: Query component APIs programmatically via VS Code
- 📊 **Structured API Data**: Extract Props, Events, Slots, and Methods into a queryable database
- 🏷️ **Canonical Component Names**: Uses component tags (e.g., `a-button`) as canonical identifiers

## Requirements

- Node.js >= 20.0.0
- pnpm

## Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Usage

### 1. Index Documentation

Before using the MCP server, you need to index the Ant Design Vue documentation:

```bash
# Index v3 documentation
pnpm index:v3

# Index v4 documentation
pnpm index:v4

# Index both v3 and v4
pnpm index:all
```

The indexer will:
1. Discover all component documentation pages
2. Fetch and parse each page
3. Extract component metadata and API tables
4. Store everything in a SQLite database at `./data/antdv.sqlite`

**Note**: The database file is gitignored and must be generated locally.

### 2. Configure VS Code MCP

Add the MCP server to your VS Code configuration. Create or edit `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "antdv": {
      "command": "node",
      "args": [
        "/absolute/path/to/antdv-mcp/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "ANTDV_DB_PATH": "/absolute/path/to/antdv-mcp/data/antdv.sqlite"
      }
    }
  }
}
```

**Important**: Use absolute paths for both the server script and database file.

### 3. Available MCP Tools

Once configured, the following tools are available in VS Code:

#### `adv_search_docs`

Search documentation with full-text search.

```typescript
{
  query: string,           // Search query
  version?: 'v3' | 'v4' | 'all',  // Default: 'all'
  limit?: number          // Default: 10
}
```

**Example**: Search for button size information
```json
{
  "query": "button size",
  "version": "v4",
  "limit": 5
}
```

#### `adv_list_components`

List all available components for a version.

```typescript
{
  version: 'v3' | 'v4'
}
```

**Example**: List all v4 components
```json
{
  "version": "v4"
}
```

#### `adv_get_component_api`

Get structured API documentation for a component.

```typescript
{
  component: string,      // Component name (e.g., "a-button", "button", "Button")
  version: 'v3' | 'v4'
}
```

**Example**: Get Button API for v4
```json
{
  "component": "button",
  "version": "v4"
}
```

Returns:
```typescript
{
  component: Component,
  props: ApiItem[],
  events: ApiItem[],
  slots: ApiItem[],
  methods: ApiItem[]
}
```

#### `adv_find_prop`

Find a specific prop or API item with suggestions for similar names.

```typescript
{
  component: string,
  prop: string,
  version: 'v3' | 'v4'
}
```

**Example**: Find the "type" prop of Button
```json
{
  "component": "a-button",
  "prop": "type",
  "version": "v4"
}
```

## Component Name Resolution

The system uses **component tags** (e.g., `a-button`) as canonical identifiers. You can query using:
- Canonical tag: `a-button`
- Without prefix: `button`
- Pascal case: `Button`
- Chinese title: will match via aliases

All outputs use the canonical tag format.

## Project Structure

```
antdv-mcp/
├── packages/
│   ├── shared/          # Shared types and utilities
│   ├── indexer/         # Documentation crawler and indexer
│   └── mcp-server/      # MCP server implementation
├── data/                # SQLite database (gitignored, generated)
├── package.json         # Root package with workspace scripts
└── pnpm-workspace.yaml  # pnpm workspace configuration
```

## Database Schema

### Tables

- **pages**: Full page content with FTS
- **components**: Component metadata and aliases
- **api_items**: API documentation (props/events/slots/methods)

### Full-Text Search

- `pages_fts`: FTS5 index for page content
- `api_items_fts`: FTS5 index for API descriptions

## Development

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @antdv-mcp/indexer build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @antdv-mcp/indexer test
```

### Linting

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format
```

## How It Works

### Indexing Process

1. **Discovery**: Crawls the overview page to find all component documentation URLs
2. **Fetching**: Downloads each component page with rate limiting
3. **Change Detection**: Uses SHA-256 hashing to skip unchanged pages
4. **Parsing**: Extracts component metadata and API tables using Cheerio
5. **Normalization**: Standardizes table headers and extracts enum values
6. **Storage**: Saves structured data to SQLite with full-text search

### MCP Server

- Runs as a stdio-based MCP server
- Reads from the SQLite database (read-only)
- Exposes tools for documentation queries
- Returns structured JSON responses

## Troubleshooting

### Database not found

Make sure to run the indexer first:
```bash
pnpm index:all
```

### MCP server not appearing in VS Code

- Check that paths in `cline_mcp_settings.json` are absolute
- Ensure the server is built: `pnpm build`
- Restart VS Code

### No API items found

Some components may have non-standard table formats. The parser handles common cases but may miss edge cases.

## License

MIT

## Contributing

This is a general-purpose documentation indexer and MCP server, not official Ant Design Vue tooling. Contributions are welcome!
