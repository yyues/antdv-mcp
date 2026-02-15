import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { Version } from '@antdv-mcp/shared';

export interface CrawlerOptions {
  userAgent?: string;
  delayMs?: number;
}

export class Crawler {
  private userAgent: string;
  private delayMs: number;
  private lastFetchTime: number = 0;

  constructor(options: CrawlerOptions = {}) {
    this.userAgent =
      options.userAgent || 'antdv-mcp-indexer/1.0 (Documentation Indexer)';
    this.delayMs = options.delayMs || 1000;
  }

  private async delay() {
    const now = Date.now();
    const elapsed = now - this.lastFetchTime;
    if (elapsed < this.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs - elapsed));
    }
    this.lastFetchTime = Date.now();
  }

  async fetchPage(url: string): Promise<{ html: string; sha256: string }> {
    await this.delay();

    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    const html = await response.text();
    const sha256 = crypto.createHash('sha256').update(html).digest('hex');

    return { html, sha256 };
  }

  extractText(html: string): string {
    const $ = cheerio.load(html);
    // Remove script and style elements
    $('script, style').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  async discoverComponents(version: Version): Promise<Array<{ url: string; title: string }>> {
    const overviewUrl =
      version === 'v3'
        ? 'https://3x.antdv.com/components/overview-cn/'
        : 'https://antdv.com/components/overview-cn/';

    const { html } = await this.fetchPage(overviewUrl);
    const $ = cheerio.load(html);
    const components: Array<{ url: string; title: string }> = [];

    // Find component links in the overview page
    // Typical structure: links in sidebar or main content pointing to component pages
    const baseUrl = version === 'v3' ? 'https://3x.antdv.com' : 'https://antdv.com';

    $('a[href*="/components/"]').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();

      if (
        href &&
        title &&
        href.includes('/components/') &&
        !href.includes('/overview') &&
        href.endsWith('-cn')
      ) {
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        if (!components.find((c) => c.url === fullUrl)) {
          components.push({ url: fullUrl, title });
        }
      }
    });

    return components;
  }

  extractComponentTag(url: string, $: cheerio.CheerioAPI): string {
    // Extract component tag from URL: /components/button-cn -> button
    const match = url.match(/\/components\/([^/]+)-cn/);
    if (match) {
      const name = match[1];
      // Convert to tag format: button -> a-button
      return name.startsWith('a-') ? name : `a-${name}`;
    }

    // Fallback: try to find in page content
    const code = $('code').first().text();
    const tagMatch = code.match(/<(a-[a-z-]+)/);
    if (tagMatch) {
      return tagMatch[1];
    }

    throw new Error(`Could not extract component tag from ${url}`);
  }

  extractTitle($: cheerio.CheerioAPI): string {
    // Try h1 first
    const h1 = $('h1').first().text().trim();
    if (h1) return h1;

    // Try title tag
    const title = $('title').text().trim();
    if (title) return title;

    return 'Unknown';
  }
}
