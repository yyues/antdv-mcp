#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import {
  Version,
  Component,
  ApiItem,
  ComponentApi,
  SearchResult,
  normalizeComponentTag,
} from '@antdv-mcp/shared';

const DB_PATH = process.env.ANTDV_DB_PATH || './data/antdv.sqlite';

class AntdvMcpServer {
  private server: Server;
  private db: Database.Database;

  constructor() {
    this.server = new Server(
      {
        name: 'antdv-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.db = new Database(DB_PATH, { readonly: true });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('Missing arguments');
        }

        switch (name) {
          case 'adv_search_docs':
            return await this.searchDocs(
              args.query as string,
              args.version as Version | 'all' | undefined,
              args.limit as number | undefined
            );

          case 'adv_list_components':
            return await this.listComponents(args.version as Version);

          case 'adv_get_component_api':
            return await this.getComponentApi(args.component as string, args.version as Version);

          case 'adv_find_prop':
            return await this.findProp(
              args.component as string,
              args.prop as string,
              args.version as Version
            );

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'adv_search_docs',
        description:
          'Search Ant Design Vue documentation with full-text search. Returns matching pages and API items with snippets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            version: {
              type: 'string',
              enum: ['v3', 'v4', 'all'],
              description: 'Version to search (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'adv_list_components',
        description: 'List all available components for a specific version.',
        inputSchema: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              enum: ['v3', 'v4'],
              description: 'Version to list components for',
            },
          },
          required: ['version'],
        },
      },
      {
        name: 'adv_get_component_api',
        description:
          'Get structured API documentation for a component, including props, events, slots, and methods.',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'Component name (e.g., "a-button", "button", or "Button")',
            },
            version: {
              type: 'string',
              enum: ['v3', 'v4'],
              description: 'Version to get API for',
            },
          },
          required: ['component', 'version'],
        },
      },
      {
        name: 'adv_find_prop',
        description: 'Find a specific prop or API item for a component with alternatives.',
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              description: 'Component name',
            },
            prop: {
              type: 'string',
              description: 'Property/API item name',
            },
            version: {
              type: 'string',
              enum: ['v3', 'v4'],
              description: 'Version to search in',
            },
          },
          required: ['component', 'prop', 'version'],
        },
      },
    ];
  }

  private async searchDocs(query: string, version: Version | 'all' = 'all', limit: number = 10) {
    const results: SearchResult[] = [];

    // Search pages
    let pageQuery = `
      SELECT p.url, p.title, p.version, snippet(pages_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
      FROM pages_fts
      JOIN pages p ON pages_fts.rowid = p.id
      WHERE pages_fts MATCH ?
    `;

    if (version !== 'all') {
      pageQuery += ` AND p.version = ?`;
    }

    pageQuery += ` LIMIT ?`;

    const pageParams = version !== 'all' ? [query, version, limit] : [query, limit];
    const pageRows = this.db.prepare(pageQuery).all(...pageParams) as any[];

    for (const row of pageRows) {
      results.push({
        type: 'page',
        title: row.title,
        snippet: row.snippet,
        url: row.url,
        version: row.version,
      });
    }

    // Search API items
    let apiQuery = `
      SELECT a.component_tag, a.name, a.description, a.kind, a.source_url, a.version,
             snippet(api_items_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
      FROM api_items_fts
      JOIN api_items a ON api_items_fts.rowid = a.id
      WHERE api_items_fts MATCH ?
    `;

    if (version !== 'all') {
      apiQuery += ` AND a.version = ?`;
    }

    apiQuery += ` LIMIT ?`;

    const apiParams = version !== 'all' ? [query, version, limit] : [query, limit];
    const apiRows = this.db.prepare(apiQuery).all(...apiParams) as any[];

    for (const row of apiRows) {
      results.push({
        type: 'api',
        title: `${row.component_tag}.${row.name} (${row.kind})`,
        snippet: row.snippet || row.description || '',
        url: row.source_url,
        version: row.version,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async listComponents(version: Version) {
    const components = this.db
      .prepare('SELECT tag, title, doc_url FROM components WHERE version = ? ORDER BY tag')
      .all(version) as Component[];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(components, null, 2),
        },
      ],
    };
  }

  private async getComponentApi(
    componentName: string,
    version: Version
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const tag = normalizeComponentTag(componentName);

    // Find component
    const component = this.db
      .prepare('SELECT * FROM components WHERE version = ? AND tag = ?')
      .get(version, tag) as Component | undefined;

    if (!component) {
      // Try to find by alias
      const allComponents = this.db
        .prepare('SELECT * FROM components WHERE version = ?')
        .all(version) as Component[];

      for (const comp of allComponents) {
        if (comp.aliases) {
          const aliases = JSON.parse(comp.aliases);
          if (aliases.some((a: string) => a.toLowerCase() === componentName.toLowerCase())) {
            return this.getComponentApi(comp.tag, version);
          }
        }
      }

      throw new Error(`Component not found: ${componentName} (${version})`);
    }

    // Get API items
    const apiItems = this.db
      .prepare(
        'SELECT * FROM api_items WHERE version = ? AND component_tag = ? ORDER BY kind, name'
      )
      .all(version, tag) as ApiItem[];

    const api: ComponentApi = {
      component,
      props: apiItems.filter((i) => i.kind === 'props'),
      events: apiItems.filter((i) => i.kind === 'events'),
      slots: apiItems.filter((i) => i.kind === 'slots'),
      methods: apiItems.filter((i) => i.kind === 'methods'),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(api, null, 2),
        },
      ],
    };
  }

  private async findProp(componentName: string, propName: string, version: Version) {
    const tag = normalizeComponentTag(componentName);

    const prop = this.db
      .prepare(
        'SELECT * FROM api_items WHERE version = ? AND component_tag = ? AND name = ? LIMIT 1'
      )
      .get(version, tag, propName) as ApiItem | undefined;

    if (!prop) {
      // Find similar props
      const similar = this.db
        .prepare(
          `SELECT * FROM api_items 
           WHERE version = ? AND component_tag = ? AND name LIKE ?
           LIMIT 5`
        )
        .all(version, tag, `%${propName}%`) as ApiItem[];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                found: false,
                suggestions: similar,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              found: true,
              item: prop,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Ant Design Vue MCP Server running on stdio');
  }
}

const server = new AntdvMcpServer();
server.run().catch(console.error);
