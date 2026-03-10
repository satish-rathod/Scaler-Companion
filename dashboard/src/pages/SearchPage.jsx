import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, File } from 'lucide-react';
import { searchContent } from '../services/api';
import Layout from '../components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

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
      console.error('Search failed', err);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Search Content</h2>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transcripts and notes..."
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Search
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Search across all your transcripts and notes</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, idx) => (
              <Card
                key={idx}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/recording/${result.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {result.type === 'notes' ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <File className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm">{result.title}</CardTitle>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {result.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md font-mono">
                    {result.match}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchPage;
