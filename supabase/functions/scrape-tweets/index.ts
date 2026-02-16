import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TweetData {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

interface RequestBody {
  jobId: string;
  periodStart: string;
  periodEnd: string;
}

async function analyzeTweetsWithAI(tweets: any[], batchSize = 50) {
  // Set in Supabase: Project Settings → Edge Functions → Secrets (not in repo)
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.warn('ANTHROPIC_API_KEY not found, skipping AI analysis');
    return [];
  }

  const allExtractions: any[] = [];

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
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt,
          }],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', await response.text());
        continue;
      }

      const data = await response.json();
      const content = data.content[0].text;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (extracted.items) {
          for (const item of extracted.items) {
            item.batch_tweets = batch;
          }
          allExtractions.push(...extracted.items);
        }
      }
    } catch (error) {
      console.error('Error analyzing batch:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allExtractions;
}

async function analyzeTrending(
  supabaseClient: any,
  tweets: any[],
  periodStart: string,
  periodEnd: string
) {
  if (tweets.length === 0) {
    return 0;
  }

  console.log(`Analyzing ${tweets.length} tweets with AI...`);
  const extractions = await analyzeTweetsWithAI(tweets);

  console.log(`Found ${extractions.length} items from AI analysis`);

  const trendingMap = new Map<string, {
    type: 'software' | 'book' | 'idea';
    name: string;
    mentions: number;
    engagement: number;
    creators: Set<string>;
    tweets: Array<{id: string, content: string, likes: number, creator_id: string}>;
    contexts: Set<string>;
    sentiment: string;
  }>();

  for (const extraction of extractions) {
    const normalizedName = extraction.name.trim();
    const key = normalizedName.toLowerCase();

    if (!trendingMap.has(key)) {
      trendingMap.set(key, {
        type: extraction.type,
        name: normalizedName,
        mentions: 0,
        engagement: 0,
        creators: new Set(),
        tweets: [],
        contexts: new Set(),
        sentiment: extraction.sentiment || 'neutral',
      });
    }

    const item = trendingMap.get(key)!;

    if (extraction.tweet_indices && extraction.batch_tweets) {
      for (const idx of extraction.tweet_indices) {
        const tweet = extraction.batch_tweets[idx];
        if (tweet) {
          const engagement = tweet.likes + tweet.retweets * 2 + tweet.replies;
          item.mentions++;
          item.engagement += engagement;
          item.creators.add(tweet.creator_id);

          if (item.tweets.length < 5) {
            item.tweets.push({
              id: tweet.id,
              content: tweet.content,
              likes: tweet.likes,
              creator_id: tweet.creator_id,
            });
          }
        }
      }
    }

    if (extraction.context) {
      item.contexts.add(extraction.context);
    }
  }

  const trendingItems = Array.from(trendingMap.values())
    .filter(item => item.mentions >= 1)
    .map(item => {
      const sortedTweets = item.tweets
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 3);

      return {
        item_type: item.type,
        name: item.name,
        mention_count: item.mentions,
        total_engagement: item.engagement,
        creator_count: item.creators.size,
        time_period_start: periodStart,
        time_period_end: periodEnd,
        sample_tweets: sortedTweets,
        sentiment: item.sentiment,
        top_contexts: Array.from(item.contexts).slice(0, 3),
      };
    })
    .sort((a, b) => b.total_engagement - a.total_engagement);

  if (trendingItems.length > 0) {
    await supabaseClient.from('trending_items').delete()
      .gte('time_period_start', periodStart)
      .lte('time_period_end', periodEnd);

    const { error } = await supabaseClient
      .from('trending_items')
      .insert(trendingItems);

    if (error) {
      console.error('Error inserting trending items:', error);
      throw error;
    }
  }

  return trendingItems.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { jobId, periodStart, periodEnd }: RequestBody = await req.json();

    await supabaseClient
      .from('scrape_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const { data: creators } = await supabaseClient
      .from('creators')
      .select('*')
      .eq('is_active', true);

    if (!creators || creators.length === 0) {
      throw new Error('No active creators found');
    }

    const xApiKey = Deno.env.get("X_API_BEARER_TOKEN");
    if (!xApiKey) {
      await supabaseClient
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: 'X API credentials not configured. Please add X_API_BEARER_TOKEN to your edge function secrets.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          error: 'X API credentials not configured',
          message: 'Please configure X_API_BEARER_TOKEN in your Supabase project settings under Edge Functions secrets.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let totalTweets = 0;
    const allTweets: any[] = [];
    const errorLogs: string[] = [];
    let successfulCreators = 0;

    for (const creator of creators) {
      try {
        const userResponse = await fetch(
          `https://api.twitter.com/2/users/by/username/${creator.username}`,
          {
            headers: {
              'Authorization': `Bearer ${xApiKey}`,
            },
          }
        );

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          const errorMsg = `Failed to fetch user ${creator.username}: ${userResponse.status} - ${errorText}`;
          console.error(errorMsg);
          errorLogs.push(errorMsg);
          continue;
        }

        const userData = await userResponse.json();
        const userId = userData.data?.id;

        if (!userId) {
          const errorMsg = `No user ID found for ${creator.username}`;
          console.error(errorMsg);
          errorLogs.push(errorMsg);
          continue;
        }

        // We pay X for every tweet we fetch—use all of them in AI context. No pool/keep.
        const tweetsPerCreator = Math.min(100, Math.max(10, parseInt(Deno.env.get("X_TWEETS_PER_CREATOR") ?? "25", 10)));

        const tweetsResponse = await fetch(
          `https://api.twitter.com/2/users/${userId}/tweets?` +
          `max_results=${tweetsPerCreator}&` +
          `start_time=${new Date(periodStart).toISOString()}&` +
          `end_time=${new Date(periodEnd).toISOString()}&` +
          `tweet.fields=created_at,public_metrics`,
          {
            headers: {
              'Authorization': `Bearer ${xApiKey}`,
            },
          }
        );

        if (!tweetsResponse.ok) {
          const errorText = await tweetsResponse.text();
          const errorMsg = `Failed to fetch tweets for ${creator.username}: ${tweetsResponse.status} - ${errorText}`;
          console.error(errorMsg);
          errorLogs.push(errorMsg);
          continue;
        }

        const tweetsData = await tweetsResponse.json();
        const tweets: TweetData[] = tweetsData.data || [];

        console.log(`Found ${tweets.length} tweets for ${creator.username}`);
        successfulCreators++;

        for (const tweet of tweets) {
          const { error } = await supabaseClient
            .from('tweets')
            .upsert({
              tweet_id: tweet.id,
              creator_id: creator.id,
              content: tweet.text,
              likes: tweet.public_metrics.like_count,
              retweets: tweet.public_metrics.retweet_count,
              replies: tweet.public_metrics.reply_count,
              posted_at: tweet.created_at,
              scraped_at: new Date().toISOString(),
            }, { onConflict: 'tweet_id' });

          if (error) {
            console.error('Error inserting tweet:', error);
          } else {
            totalTweets++;
            allTweets.push({
              id: tweet.id,
              creator_id: creator.id,
              content: tweet.text,
              likes: tweet.public_metrics.like_count,
              retweets: tweet.public_metrics.retweet_count,
              replies: tweet.public_metrics.reply_count,
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = `Error processing creator ${creator.username}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errorLogs.push(errorMsg);
      }
    }

    if (totalTweets === 0 && errorLogs.length > 0) {
      await supabaseClient
        .from('scrape_jobs')
        .update({
          status: 'failed',
          tweets_scraped: 0,
          error_message: `No tweets found. Errors: ${errorLogs.slice(0, 3).join('; ')}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          error: 'No tweets scraped',
          details: errorLogs,
          creators_attempted: creators.length,
          successful_creators: successfulCreators,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trendingCount = await analyzeTrending(
      supabaseClient,
      allTweets,
      periodStart,
      periodEnd
    );

    await supabaseClient
      .from('scrape_jobs')
      .update({
        status: 'completed',
        tweets_scraped: totalTweets,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        tweets_scraped: totalTweets,
        trending_items_found: trendingCount,
        creators_processed: creators.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in scrape function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
