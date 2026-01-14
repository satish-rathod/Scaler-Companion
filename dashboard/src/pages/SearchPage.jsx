import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader, FileText, File } from 'lucide-react';
import { searchContent } from '../services/api';
import Layout from '../components/layout/Layout';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchContent(query);
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Content</h2>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcripts and notes..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/recording/${result.id}`)}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.type === 'notes' ? (
                  <FileText className="w-4 h-4 text-purple-500" />
                ) : (
                  <File className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {result.type}
                </span>
                <span className="text-gray-300">•</span>
                <h3 className="font-medium text-gray-900">{result.title}</h3>
              </div>

              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono">
                {result.match}
              </p>
            </div>
          ))}

          {hasSearched && !loading && results.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SearchPage;
