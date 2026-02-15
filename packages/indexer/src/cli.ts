#!/usr/bin/env node
import { Command } from 'commander';
import { Indexer } from './indexer';

const program = new Command();

program
  .name('antdv-indexer')
  .description('Ant Design Vue documentation indexer')
  .version('1.0.0');

program
  .command('index <version>')
  .description('Index documentation for a specific version (v3, v4, or all)')
  .option('-d, --db <path>', 'Database path', './data/antdv.sqlite')
  .action(async (version: string, options) => {
    const indexer = new Indexer(options.db);

    try {
      if (version === 'all') {
        await indexer.indexVersion('v3');
        await indexer.indexVersion('v4');
      } else if (version === 'v3' || version === 'v4') {
        await indexer.indexVersion(version);
      } else {
        console.error('Invalid version. Use v3, v4, or all');
        process.exit(1);
      }

      console.log('\n✓ Indexing complete!');
    } catch (error) {
      console.error('Indexing failed:', error);
      process.exit(1);
    } finally {
      indexer.close();
    }
  });

program.parse();
