import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');
const menuFile = path.join(here, '..', 'data', 'menu.json');

const port = Number(process.env.PORT) || 3000;
const app = express();

app.disable('x-powered-by');

/**
 * The menu is read from disk on every request. It is a few kilobytes, and it
 * means editing data/menu.json updates the site without a restart.
 */
async function readMenu() {
  const menu = JSON.parse(await readFile(menuFile, 'utf8'));

  if (!Array.isArray(menu.items) || !Array.isArray(menu.categories)) {
    throw new Error('menu.json needs "categories" and "items" arrays');
  }

  const categories = new Set(menu.categories.map((category) => category.id));
  for (const item of menu.items) {
    if (!categories.has(item.category)) {
      throw new Error(`menu item "${item.id}" uses unknown category "${item.category}"`);
    }
  }

  return menu;
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

app.get('/api/menu', async (_request, response) => {
  try {
    const menu = await readMenu();
    response.set('Cache-Control', 'no-store');
    response.json(menu);
  } catch (error) {
    console.error(`Could not read ${menuFile}:`, error.message);
    response.status(500).json({ error: 'The menu could not be loaded.' });
  }
});

app.use(express.static(publicDir, { index: 'index.html', maxAge: 0 }));

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Unknown API route.' });
});

app.use((_request, response) => {
  response.status(404).type('text/plain').send('Page not found.');
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Restaurant menu running on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
