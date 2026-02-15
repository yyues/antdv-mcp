# Contributing to Ant Design Vue MCP

Thank you for your interest in contributing! This is a community project providing MCP tooling for Ant Design Vue documentation.

## Development Setup

1. **Prerequisites**
   - Node.js >= 20.0.0
   - pnpm (latest version)

2. **Clone and Install**
   ```bash
   git clone https://github.com/yyues/antdv-mcp.git
   cd antdv-mcp
   pnpm install
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Run Tests**
   ```bash
   pnpm test
   ```

## Project Structure

```
antdv-mcp/
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── indexer/      # Documentation crawler and indexer
│   └── mcp-server/   # MCP server implementation
├── docs/             # Additional documentation
└── .github/          # GitHub Actions workflows
```

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Add tests for new functionality
   - Update documentation as needed

3. **Ensure quality**
   ```bash
   pnpm lint
   pnpm build
   pnpm test
   ```

4. **Submit a pull request**
   - Describe your changes clearly
   - Reference any related issues

## Areas for Contribution

- **Parser Improvements**: Better handling of edge cases in documentation parsing
- **Additional MCP Tools**: New tools for querying documentation
- **Testing**: Expand test coverage
- **Documentation**: Improve examples and guides
- **Performance**: Optimize indexing and query performance

## Code Style

- Follow the existing code style
- Use TypeScript strictly
- Run `pnpm lint` and `pnpm format` before committing

## Questions?

Open an issue for discussion!
