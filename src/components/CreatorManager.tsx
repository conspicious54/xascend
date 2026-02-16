import { useState, useEffect } from 'react';
import { api, type Creator } from '../lib/api';
import { Plus, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';

export default function CreatorManager() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    setLoading(true);
    try {
      const data = await api.getCreators();
      setCreators(data || []);
    } catch (e) {
      console.error('Error loading creators:', e);
    } finally {
      setLoading(false);
    }
  };

  const addCreator = async () => {
    if (!newUsername.trim()) return;

    setAdding(true);
    try {
      await api.addCreator(newUsername.trim(), newDisplayName.trim() || undefined);
      setNewUsername('');
      setNewDisplayName('');
      loadCreators();
    } catch (e) {
      console.error('Error adding creator:', e);
      alert('Error adding creator. Username may already exist.');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.updateCreator(id, !currentStatus);
      loadCreators();
    } catch (e) {
      console.error('Error updating creator:', e);
    }
  };

  const deleteCreator = async (id: string) => {
    if (!confirm('Are you sure you want to delete this creator?')) return;

    try {
      await api.deleteCreator(id);
      loadCreators();
    } catch (e) {
      console.error('Error deleting creator:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Manage Creators</h2>

      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Add New Creator</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Username (e.g., @johndoe)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCreator()}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={adding}
          />
          <input
            type="text"
            placeholder="Display name (optional)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCreator()}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={adding}
          />
          <button
            onClick={addCreator}
            disabled={adding || !newUsername.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {adding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {creators.length === 0 ? (
          <p className="text-center text-slate-600 py-8">
            No creators added yet. Add some creators to start tracking!
          </p>
        ) : (
          creators.map((creator) => (
            <div
              key={creator.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${creator.is_active ? 'bg-green-100' : 'bg-slate-200'}`}>
                  {creator.is_active ? (
                    <UserCheck className="w-5 h-5 text-green-700" />
                  ) : (
                    <UserX className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">@{creator.username}</p>
                  {creator.display_name && (
                    <p className="text-sm text-slate-600">{creator.display_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(creator.id, creator.is_active)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    creator.is_active
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {creator.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteCreator(creator.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Active creators:</strong> {creators.filter(c => c.is_active).length} of {creators.length}
        </p>
      </div>
    </div>
  );
}
