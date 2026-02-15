import { DatabaseManager } from './database';
import { Crawler } from './crawler';
import { Parser } from './parser';
import { Version, Page, Component } from '@antdv-mcp/shared';
import * as cheerio from 'cheerio';

export class Indexer {
  private dbManager: DatabaseManager;
  private crawler: Crawler;
  private parser: Parser;

  constructor(dbPath?: string) {
    this.dbManager = new DatabaseManager(dbPath);
    this.crawler = new Crawler();
    this.parser = new Parser();
  }

  async indexVersion(version: Version) {
    console.log(`\nIndexing ${version}...`);

    // Discover components
    const components = await this.crawler.discoverComponents(version);
    console.log(`Found ${components.length} components for ${version}`);

    for (const comp of components) {
      try {
        await this.indexComponent(comp.url, version);
      } catch (error) {
        console.error(`Error indexing ${comp.url}:`, error);
      }
    }

    console.log(`\nFinished indexing ${version}`);
  }

  async indexComponent(url: string, version: Version) {
    const db = this.dbManager.getDatabase();

    // Fetch page
    const { html, sha256 } = await this.crawler.fetchPage(url);

    // Check if page has changed
    const existing = db.prepare('SELECT sha256 FROM pages WHERE url = ?').get(url) as
      | { sha256: string }
      | undefined;

    if (existing && existing.sha256 === sha256) {
      console.log(`  Skipped (unchanged): ${url}`);
      return;
    }

    const $ = cheerio.load(html);

    // Extract metadata
    const componentTag = this.crawler.extractComponentTag(url, $);
    const title = this.crawler.extractTitle($);
    const text = this.crawler.extractText(html);

    // Save page
    const page: Page = {
      url,
      version,
      title,
      html,
      text,
      fetched_at: Date.now(),
      sha256,
    };

    db.prepare(
      `INSERT OR REPLACE INTO pages (url, version, title, html, text, fetched_at, sha256)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(page.url, page.version, page.title, page.html, page.text, page.fetched_at, page.sha256);

    // Extract and save component
    const component: Component = {
      version,
      tag: componentTag,
      title,
      doc_url: url,
      aliases: JSON.stringify([title, componentTag.replace('a-', '')]),
    };

    db.prepare(
      `INSERT OR REPLACE INTO components (version, tag, title, doc_url, aliases)
       VALUES (?, ?, ?, ?, ?)`
    ).run(component.version, component.tag, component.title, component.doc_url, component.aliases);

    // Extract API items
    const apiItems = this.parser.extractApiSections(html, version, componentTag, url);

    // Delete old API items for this component
    db.prepare('DELETE FROM api_items WHERE version = ? AND component_tag = ?').run(
      version,
      componentTag
    );

    // Insert new API items
    const insertStmt = db.prepare(
      `INSERT INTO api_items 
       (version, component_tag, kind, name, type, required, default_value, description, enum_values, since, deprecated, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of apiItems) {
      insertStmt.run(
        item.version,
        item.component_tag,
        item.kind,
        item.name,
        item.type,
        item.required ? 1 : 0,
        item.default_value,
        item.description,
        item.enum_values,
        item.since,
        item.deprecated,
        item.source_url
      );
    }

    console.log(`  Indexed: ${componentTag} (${apiItems.length} API items)`);
  }

  close() {
    this.dbManager.close();
  }
}
