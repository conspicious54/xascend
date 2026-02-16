import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const dbPath = process.env.DATABASE_PATH || join(dataDir, 'app.db');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tweets (
    id TEXT PRIMARY KEY,
    tweet_id TEXT UNIQUE NOT NULL,
    creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    posted_at TEXT NOT NULL,
    scraped_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trending_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL CHECK (item_type IN ('software', 'book', 'idea')),
    name TEXT NOT NULL,
    mention_count INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    creator_count INTEGER DEFAULT 0,
    time_period_start TEXT NOT NULL,
    time_period_end TEXT NOT NULL,
    sample_tweets TEXT,
    sentiment TEXT DEFAULT 'neutral',
    top_contexts TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scrape_jobs (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    tweets_scraped INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tweets_creator ON tweets(creator_id);
  CREATE INDEX IF NOT EXISTS idx_tweets_posted ON tweets(posted_at);
  CREATE INDEX IF NOT EXISTS idx_trending_period ON trending_items(time_period_start, time_period_end);
`);

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCreators(activeOnly = false) {
  const stmt = activeOnly
    ? db.prepare('SELECT * FROM creators WHERE is_active = 1 ORDER BY username')
    : db.prepare('SELECT * FROM creators ORDER BY username');
  return stmt.all().map(row => ({
    ...row,
    is_active: Boolean(row.is_active),
  }));
}

export function addCreator({ username, display_name = null }) {
  const id = uuid();
  db.prepare('INSERT INTO creators (id, username, display_name, is_active) VALUES (?, ?, ?, 1)')
    .run(id, username.replace(/^@/, ''), display_name || null);
  return { id, username: username.replace(/^@/, ''), display_name, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

export function updateCreator(id, { is_active }) {
  db.prepare('UPDATE creators SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(is_active ? 1 : 0, id);
}

export function deleteCreator(id) {
  db.prepare('DELETE FROM creators WHERE id = ?').run(id);
}

export function getTrendingItems(limit = 50) {
  const rows = db.prepare(`
    SELECT * FROM trending_items
    ORDER BY total_engagement DESC
    LIMIT ?
  `).all(limit);
  return rows.map(row => ({
    ...row,
    sample_tweets: row.sample_tweets ? JSON.parse(row.sample_tweets) : [],
    top_contexts: row.top_contexts ? JSON.parse(row.top_contexts) : [],
  }));
}

export function getScrapeJobs(limit = 5) {
  return db.prepare(`
    SELECT * FROM scrape_jobs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

export function createScrapeJob(periodStart, periodEnd) {
  const id = uuid();
  db.prepare(`
    INSERT INTO scrape_jobs (id, status, period_start, period_end, tweets_scraped)
    VALUES (?, 'pending', ?, ?, 0)
  `).run(id, periodStart, periodEnd);
  return id;
}

export function setJobRunning(id) {
  db.prepare('UPDATE scrape_jobs SET status = \'running\', started_at = datetime(\'now\') WHERE id = ?').run(id);
}

export function setJobCompleted(id, tweetsScraped) {
  db.prepare('UPDATE scrape_jobs SET status = \'completed\', tweets_scraped = ?, completed_at = datetime(\'now\') WHERE id = ?').run(tweetsScraped, id);
}

export function setJobFailed(id, errorMessage) {
  db.prepare('UPDATE scrape_jobs SET status = \'failed\', error_message = ?, completed_at = datetime(\'now\') WHERE id = ?').run(errorMessage, id);
}

export function upsertTweet({ tweet_id, creator_id, content, likes, retweets, replies, posted_at }) {
  const id = uuid();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tweets (id, tweet_id, creator_id, content, likes, retweets, replies, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, tweet_id, creator_id, content, likes, retweets, replies, posted_at);
  const inserted = db.changes > 0;
  return { id: inserted ? id : null, inserted };
}

export function deleteTrendingForPeriod(periodStart, periodEnd) {
  db.prepare('DELETE FROM trending_items WHERE time_period_start = ? AND time_period_end = ?').run(periodStart, periodEnd);
}

export function insertTrendingItems(items) {
  const stmt = db.prepare(`
    INSERT INTO trending_items (id, item_type, name, mention_count, total_engagement, creator_count, time_period_start, time_period_end, sample_tweets, sentiment, top_contexts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    stmt.run(
      uuid(),
      item.item_type,
      item.name,
      item.mention_count,
      item.total_engagement,
      item.creator_count,
      item.time_period_start,
      item.time_period_end,
      JSON.stringify(item.sample_tweets || []),
      item.sentiment || 'neutral',
      JSON.stringify(item.top_contexts || [])
    );
  }
}

export { db, uuid };
