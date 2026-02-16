import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getCreators,
  addCreator,
  updateCreator,
  deleteCreator,
  getTrendingItems,
  getScrapeJobs,
  createScrapeJob,
} from './db.js';
import { runScrape, analyzePaste } from './scrape.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/api/creators', (req, res) => {
  try {
    const creators = getCreators(false);
    res.json(creators);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/creators', (req, res) => {
  try {
    const { username, display_name } = req.body || {};
    if (!username?.trim()) return res.status(400).json({ error: 'username required' });
    const creator = addCreator({ username: username.trim(), display_name: display_name?.trim() || null });
    res.status(201).json(creator);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/creators/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active (boolean) required' });
    updateCreator(id, { is_active });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/creators/:id', (req, res) => {
  try {
    deleteCreator(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/trending-items', (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10) || 50);
    const items = getTrendingItems(limit);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/scrape-jobs', (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit || '5', 10) || 5);
    const jobs = getScrapeJobs(limit);
    res.json(jobs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze-paste', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) required' });
    }
    const result = await analyzePaste(text);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    console.error('Paste analyze error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body || {};
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd required (ISO strings)' });
    }
    const jobId = createScrapeJob(periodStart, periodEnd);
    const result = await runScrape(jobId, periodStart, periodEnd);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json({ success: true, jobId, ...result });
  } catch (e) {
    console.error('Scrape error:', e);
    res.status(500).json({ error: e.message });
  }
});

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!isProduction) console.log('API: http://localhost:' + PORT + '/api/...');
});
