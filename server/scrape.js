import {
  getCreators,
  upsertTweet,
  deleteTrendingForPeriod,
  insertTrendingItems,
  setJobRunning,
  setJobCompleted,
  setJobFailed,
} from './db.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const X_API_BEARER_TOKEN = process.env.X_API_BEARER_TOKEN;

// We pay X for every tweet we fetch—so we use every one in the AI context. No "pool then keep top N."
const tweetsPerCreator = Math.min(100, Math.max(10, parseInt(process.env.X_TWEETS_PER_CREATOR || '25', 10)));

async function analyzeTweetsWithAI(tweets, batchSize = 50) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set, skipping AI analysis');
    return [];
  }
  const allExtractions = [];
  for (let i = 0; i < tweets.length; i += batchSize) {
    const batch = tweets.slice(i, i + batchSize);
    const tweetTexts = batch.map((t, idx) => `[${idx}] ${t.content}`).join('\n\n');
    const prompt = `You are discovering emerging software, books, and ideas from what people are actually saying—NOT matching against any predefined list or database.

Read each tweet and infer from CONTEXT what is being talked about. Extract only what is clearly implied or stated in the post:
1. SOFTWARE/TOOLS - Apps, SaaS, AI tools, or software the author is using, recommending, or discussing (infer the product name from context)
2. BOOKS - Books they reference, recommend, or quote (title/author from context)
3. IDEAS - Concepts, frameworks, methodologies, or mental models they're discussing (name the idea as expressed in the tweet)

We want things people are just starting to talk about or that are emerging—not famous brands everyone already knows. Prefer specific names/titles that appear in or are clearly implied by the post. Do not add items from your own knowledge that are not actually mentioned or strongly implied in the tweet text.

For each item found, provide:
- The exact name/title as it appears or is clearly implied in the post
- Which category it belongs to (software/book/idea)
- A brief context of how it was mentioned (1 sentence)
- Which tweet index(es) it appeared in
- Sentiment (positive/neutral/critical)

Tweets:
${tweetTexts}

Return ONLY valid JSON in this format:
{
  "items": [
    {
      "name": "exact name",
      "type": "software" | "book" | "idea",
      "context": "how it was mentioned",
      "tweet_indices": [0, 5],
      "sentiment": "positive" | "neutral" | "critical"
    }
  ]
}`;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        console.error('Claude API error:', await response.text());
        continue;
      }
      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (extracted.items) {
          for (const item of extracted.items) item.batch_tweets = batch;
          allExtractions.push(...extracted.items);
        }
      }
    } catch (err) {
      console.error('Error analyzing batch:', err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return allExtractions;
}

/** Analyze pasted text (e.g. from scrolling your X timeline). No X API—you pay only for Claude. */
export async function analyzePaste(rawText) {
  if (!ANTHROPIC_API_KEY) {
    return { error: 'ANTHROPIC_API_KEY not set' };
  }
  const blocks = rawText
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (blocks.length === 0) {
    return { error: 'No posts found. Paste some tweet text (e.g. one per line or paragraph).' };
  }
  const tweetTexts = blocks.map((t, idx) => `[${idx}] ${t}`).join('\n\n');
  const prompt = `You are discovering emerging software, books, and ideas from what people are actually saying—NOT matching against any predefined list or database.

Read each post and infer from CONTEXT what is being talked about. Extract only what is clearly implied or stated:
1. SOFTWARE/TOOLS - Apps, SaaS, AI tools, or software mentioned or recommended
2. BOOKS - Books referenced or recommended
3. IDEAS - Concepts, frameworks, methodologies, or mental models discussed

We want things people are just starting to talk about or that are emerging. Prefer specific names/titles from the post. Do not add items from your own knowledge that are not actually mentioned or strongly implied.

IMPORTANT: For each item, include "post_indices": an array of the post numbers [0], [1], [2]... where that item was mentioned. This lets us see which books, software, and ideas came up in MULTIPLE posts (trending in this time period). Use the exact index from each post header above.

For each item found, provide:
- name (exact or clearly implied)
- type: "software" | "book" | "idea"
- context: one sentence on how it was mentioned
- sentiment: "positive" | "neutral" | "critical"
- post_indices: array of post indices where this item appeared (e.g. [0, 3, 7])

Posts:
${tweetTexts}

Return ONLY valid JSON:
{
  "items": [
    { "name": "...", "type": "software" | "book" | "idea", "context": "...", "sentiment": "...", "post_indices": [0, 2, 5] }
  ]
}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return { error: `Claude API error: ${err}` };
    }
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'Could not parse AI response' };
    const parsed = JSON.parse(jsonMatch[0]);
    const rawItems = parsed.items || [];

    // Aggregate by name: same item mentioned in multiple posts => one entry with mention_count
    const byKey = new Map();
    for (const item of rawItems) {
      const name = item.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const indices = Array.isArray(item.post_indices) ? item.post_indices : [];

      if (!byKey.has(key)) {
        byKey.set(key, {
          name,
          type: item.type || 'idea',
          context: item.context,
          sentiment: item.sentiment || 'neutral',
          mention_count: new Set(indices).size,
          _indices: new Set(indices),
        });
      } else {
        const existing = byKey.get(key);
        for (const i of indices) existing._indices.add(i);
        existing.mention_count = existing._indices.size;
        if (item.context && existing.context !== item.context) {
          existing.context = [existing.context, item.context].filter(Boolean).join(' · ');
        }
      }
    }

    const items = Array.from(byKey.values())
      .map(({ _indices, ...rest }) => rest)
      .sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0));

    return { items };
  } catch (err) {
    return { error: err.message || 'Analysis failed' };
  }
}

function buildTrendingFromExtractions(extractions, periodStart, periodEnd) {
  const map = new Map();
  for (const ext of extractions) {
    const name = ext.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        type: ext.type,
        name,
        mentions: 0,
        engagement: 0,
        creators: new Set(),
        tweets: [],
        contexts: new Set(),
        sentiment: ext.sentiment || 'neutral',
      });
    }
    const item = map.get(key);
    if (ext.tweet_indices && ext.batch_tweets) {
      for (const idx of ext.tweet_indices) {
        const tweet = ext.batch_tweets[idx];
        if (tweet) {
          item.mentions++;
          item.engagement += tweet.likes + (tweet.retweets || 0) * 2 + (tweet.replies || 0);
          item.creators.add(tweet.creator_id);
          if (item.tweets.length < 5) {
            item.tweets.push({ id: tweet.id, content: tweet.content, likes: tweet.likes, creator_id: tweet.creator_id });
          }
        }
      }
    }
    if (ext.context) item.contexts.add(ext.context);
  }
  return Array.from(map.values())
    .filter((i) => i.mentions >= 1)
    .map((i) => ({
      item_type: i.type,
      name: i.name,
      mention_count: i.mentions,
      total_engagement: i.engagement,
      creator_count: i.creators.size,
      time_period_start: periodStart,
      time_period_end: periodEnd,
      sample_tweets: i.tweets.sort((a, b) => b.likes - a.likes).slice(0, 3),
      sentiment: i.sentiment,
      top_contexts: Array.from(i.contexts).slice(0, 3),
    }))
    .sort((a, b) => b.total_engagement - a.total_engagement);
}

export async function runScrape(jobId, periodStart, periodEnd) {
  setJobRunning(jobId);
  if (!X_API_BEARER_TOKEN) {
    setJobFailed(jobId, 'X_API_BEARER_TOKEN not set. Add it to your .env or environment.');
    return { error: 'X API not configured' };
  }
  const creators = getCreators(true);
  if (!creators.length) {
    setJobFailed(jobId, 'No active creators');
    return { error: 'No active creators' };
  }

  const allTweets = [];
  let totalTweets = 0;
  const errors = [];

  for (const creator of creators) {
    try {
      const userRes = await fetch(
        `https://api.twitter.com/2/users/by/username/${creator.username}`,
        { headers: { Authorization: `Bearer ${X_API_BEARER_TOKEN}` } }
      );
      if (!userRes.ok) {
        errors.push(`User ${creator.username}: ${userRes.status}`);
        continue;
      }
      const userData = await userRes.json();
      const userId = userData.data?.id;
      if (!userId) {
        errors.push(`No user ID for ${creator.username}`);
        continue;
      }

      const tweetsRes = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?` +
          `max_results=${tweetsPerCreator}&` +
          `start_time=${new Date(periodStart).toISOString()}&` +
          `end_time=${new Date(periodEnd).toISOString()}&` +
          `tweet.fields=created_at,public_metrics`,
        { headers: { Authorization: `Bearer ${X_API_BEARER_TOKEN}` } }
      );
      if (!tweetsRes.ok) {
        errors.push(`Tweets ${creator.username}: ${tweetsRes.status}`);
        continue;
      }
      const tweetsData = await tweetsRes.json();
      const tweets = tweetsData.data || [];

      for (const tweet of tweets) {
        const metrics = tweet.public_metrics || {};
        const row = {
          tweet_id: tweet.id,
          creator_id: creator.id,
          content: tweet.text,
          likes: metrics.like_count ?? 0,
          retweets: metrics.retweet_count ?? 0,
          replies: metrics.reply_count ?? 0,
          posted_at: tweet.created_at,
        };
        const { inserted } = upsertTweet(row);
        if (inserted) {
          totalTweets++;
          allTweets.push({
            id: tweet.id,
            creator_id: creator.id,
            content: tweet.text,
            likes: row.likes,
            retweets: row.retweets,
            replies: row.replies,
          });
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      errors.push(`${creator.username}: ${err.message}`);
    }
  }

  if (totalTweets === 0 && errors.length) {
    setJobFailed(jobId, errors.slice(0, 3).join('; '));
    return { error: 'No tweets scraped', details: errors };
  }

  const extractions = await analyzeTweetsWithAI(allTweets);
  const trendingItems = buildTrendingFromExtractions(extractions, periodStart, periodEnd);
  if (trendingItems.length > 0) {
    deleteTrendingForPeriod(periodStart, periodEnd);
    insertTrendingItems(trendingItems);
  }

  setJobCompleted(jobId, totalTweets);
  return {
    success: true,
    tweets_scraped: totalTweets,
    trending_items_found: trendingItems.length,
    creators_processed: creators.length,
  };
}
