import { useState } from 'react';
import type { TrendingItem } from '../lib/api';
import { Package, BookOpen, Lightbulb, TrendingUp, Users, MessageSquare, ChevronDown, ChevronUp, Heart } from 'lucide-react';

interface TrendingDisplayProps {
  items: TrendingItem[];
}

export default function TrendingDisplay({ items }: TrendingDisplayProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'software' | 'book' | 'idea'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredItems = selectedType === 'all'
    ? items
    : items.filter(item => item.item_type === selectedType);

  const softwareCount = items.filter(i => i.item_type === 'software').length;
  const bookCount = items.filter(i => i.item_type === 'book').length;
  const ideaCount = items.filter(i => i.item_type === 'idea').length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'software':
        return <Package className="w-5 h-5" />;
      case 'book':
        return <BookOpen className="w-5 h-5" />;
      case 'idea':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'software':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'book':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'idea':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Trending Topics</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setSelectedType('software')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedType === 'software'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <Package className="w-4 h-4" />
          Software ({softwareCount})
        </button>
        <button
          onClick={() => setSelectedType('book')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedType === 'book'
              ? 'bg-green-600 text-white'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Books ({bookCount})
        </button>
        <button
          onClick={() => setSelectedType('idea')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            selectedType === 'idea'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Ideas ({ideaCount})
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No trending items yet. Start a scrape to see results!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item, index) => {
            const isExpanded = expandedItems.has(item.id);
            const hasSampleTweets = item.sample_tweets && item.sample_tweets.length > 0;

            return (
              <div
                key={item.id}
                className="p-5 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-300">#{index + 1}</span>
                    <div className={`p-2 rounded-lg border ${getTypeColor(item.item_type)}`}>
                      {getIcon(item.item_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-500 capitalize">{item.item_type}</p>
                    </div>
                  </div>
                  {hasSampleTweets && (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          Hide Examples
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Show Examples
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">{item.mention_count}</span> mentions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">{item.creator_count}</span> creators
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      <span className="font-semibold text-slate-900">{item.total_engagement.toLocaleString()}</span> engagement
                    </span>
                  </div>
                  {item.sentiment && (
                    <div className="ml-auto">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                        item.sentiment === 'neutral' ? 'bg-slate-100 text-slate-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.sentiment}
                      </span>
                    </div>
                  )}
                </div>

                {isExpanded && hasSampleTweets && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Example Tweets:</h4>
                    {item.sample_tweets!.map((tweet) => (
                      <div
                        key={tweet.id}
                        className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <p className="text-sm text-slate-700 leading-relaxed mb-2">{tweet.content}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Heart className="w-3.5 h-3.5 text-red-400" />
                          <span className="font-medium">{tweet.likes.toLocaleString()}</span>
                          <span>likes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
