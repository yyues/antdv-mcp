import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = './data/antdv.sqlite') {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize() {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        html TEXT NOT NULL,
        text TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        sha256 TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pages_version ON pages(version);
      CREATE INDEX IF NOT EXISTS idx_pages_sha256 ON pages(sha256);

      CREATE TABLE IF NOT EXISTS components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        tag TEXT NOT NULL,
        title TEXT NOT NULL,
        doc_url TEXT NOT NULL,
        aliases TEXT,
        UNIQUE(version, tag)
      );

      CREATE INDEX IF NOT EXISTS idx_components_version ON components(version);
      CREATE INDEX IF NOT EXISTS idx_components_tag ON components(tag);

      CREATE TABLE IF NOT EXISTS api_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        component_tag TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        required INTEGER DEFAULT 0,
        default_value TEXT,
        description TEXT,
        values TEXT,
        since TEXT,
        deprecated TEXT,
        source_url TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_items_component ON api_items(version, component_tag);
      CREATE INDEX IF NOT EXISTS idx_api_items_kind ON api_items(kind);
      CREATE INDEX IF NOT EXISTS idx_api_items_name ON api_items(name);

      -- Full-text search for pages
      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        url,
        title,
        text,
        content=pages,
        content_rowid=id
      );

      -- Full-text search for api items
      CREATE VIRTUAL TABLE IF NOT EXISTS api_items_fts USING fts5(
        component_tag,
        name,
        description,
        content=api_items,
        content_rowid=id
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
        INSERT INTO pages_fts(rowid, url, title, text)
        VALUES (new.id, new.url, new.title, new.text);
      END;

      CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
        DELETE FROM pages_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
        UPDATE pages_fts SET url = new.url, title = new.title, text = new.text
        WHERE rowid = new.id;
      END;

      CREATE TRIGGER IF NOT EXISTS api_items_ai AFTER INSERT ON api_items BEGIN
        INSERT INTO api_items_fts(rowid, component_tag, name, description)
        VALUES (new.id, new.component_tag, new.name, COALESCE(new.description, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS api_items_ad AFTER DELETE ON api_items BEGIN
        DELETE FROM api_items_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS api_items_au AFTER UPDATE ON api_items BEGIN
        UPDATE api_items_fts 
        SET component_tag = new.component_tag, name = new.name, description = COALESCE(new.description, '')
        WHERE rowid = new.id;
      END;
    `);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close() {
    this.db.close();
  }
}
