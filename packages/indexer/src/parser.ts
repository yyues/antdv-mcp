import * as cheerio from 'cheerio';
import {
  ApiKind,
  ApiItem,
  Version,
  normalizeTableHeader,
  parseEnumValues,
} from '@antdv-mcp/shared';

interface TableData {
  headers: string[];
  rows: string[][];
}

export class Parser {
  extractApiSections(
    html: string,
    version: Version,
    componentTag: string,
    sourceUrl: string
  ): ApiItem[] {
    const $ = cheerio.load(html);
    const apiItems: ApiItem[] = [];

    // Find API sections by headers
    const headings = $('h2, h3').toArray();

    for (const heading of headings) {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase().trim();

      let kind: ApiKind | null = null;

      // Determine API kind from heading
      if (
        headingText.includes('api') ||
        headingText.includes('props') ||
        headingText.includes('属性')
      ) {
        kind = 'props';
      } else if (headingText.includes('event') || headingText.includes('事件')) {
        kind = 'events';
      } else if (headingText.includes('slot') || headingText.includes('插槽')) {
        kind = 'slots';
      } else if (headingText.includes('method') || headingText.includes('方法')) {
        kind = 'methods';
      }

      if (!kind) continue;

      // Find the next table after this heading
      let $current = $heading.next();
      while ($current.length > 0) {
        if ($current.is('table')) {
          const tableData = this.parseTable($current);
          const items = this.tableToApiItems(
            tableData,
            version,
            componentTag,
            kind,
            sourceUrl
          );
          apiItems.push(...items);
          break;
        } else if ($current.is('h2, h3')) {
          // Hit another heading, stop
          break;
        }
        $current = $current.next();
      }
    }

    return apiItems;
  }

  private parseTable($table: cheerio.Cheerio<any>): TableData {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Extract headers
    $table.find('thead tr th, thead tr td').each((_: number, th: any) => {
      headers.push(cheerio.load(th).text().trim());
    });

    // If no thead, try first row
    if (headers.length === 0) {
      $table
        .find('tr')
        .first()
        .find('th, td')
        .each((_: number, th: any) => {
          headers.push(cheerio.load(th).text().trim());
        });
    }

    // Extract rows
    $table.find('tbody tr, tr').each((_: number, tr: any) => {
      const $tr = cheerio.load(tr);
      const isHeader = $tr('th').length > 0 && $tr('td').length === 0;
      if (isHeader) return; // Skip header rows

      const row: string[] = [];
      $tr('td').each((_: number, td: any) => {
        row.push(cheerio.load(td).text().trim());
      });

      if (row.length > 0) {
        rows.push(row);
      }
    });

    return { headers, rows };
  }

  private tableToApiItems(
    tableData: TableData,
    version: Version,
    componentTag: string,
    kind: ApiKind,
    sourceUrl: string
  ): ApiItem[] {
    const { headers, rows } = tableData;

    // Normalize headers
    const normalizedHeaders = headers.map((h) => normalizeTableHeader(h));

    // Create column index map
    const colMap: Record<string, number> = {};
    normalizedHeaders.forEach((header, index) => {
      colMap[header] = index;
    });

    const items: ApiItem[] = [];

    for (const row of rows) {
      if (row.length === 0) continue;

      const name = row[colMap['name']] || row[0];
      if (!name || name === '-') continue;

      const typeStr = row[colMap['type']] || '';
      const description = row[colMap['description']] || '';
      const defaultValue = row[colMap['default']] || '';
      const requiredStr = row[colMap['required']] || '';
      const valuesStr = row[colMap['values']] || '';
      const since = row[colMap['since']] || '';
      const deprecated = row[colMap['deprecated']] || '';

      // Parse required
      const required = this.parseRequired(requiredStr);

      // Parse enum values
      let enumValues: string[] = [];
      if (valuesStr) {
        enumValues = valuesStr.split(/[,，、|]/).map((v) => v.trim());
      } else if (typeStr) {
        enumValues = parseEnumValues(typeStr);
      }

      const item: ApiItem = {
        version,
        component_tag: componentTag,
        kind,
        name,
        type: typeStr || undefined,
        required,
        default_value: defaultValue || undefined,
        description: description || undefined,
        values: enumValues.length > 0 ? JSON.stringify(enumValues) : undefined,
        since: since || undefined,
        deprecated: deprecated || undefined,
        source_url: sourceUrl,
      };

      items.push(item);
    }

    return items;
  }

  private parseRequired(str: string): boolean {
    if (!str) return false;
    const lower = str.toLowerCase().trim();
    return (
      lower === 'true' ||
      lower === 'yes' ||
      lower === '是' ||
      lower === '必填' ||
      lower === '必选'
    );
  }
}
