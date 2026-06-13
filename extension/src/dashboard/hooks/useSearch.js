import { useState, useEffect } from 'react';
import api from '../../storage/api.js';
import { semanticSearch } from '../../storage/embeddings.js';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (query.trim().length < 3) {
          const res = await api.get(`/cards?q=${encodeURIComponent(query)}`);
          setResults(res.cards || []);
        } else {
          const res = await semanticSearch(query, 10);
          setResults(res || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, results, loading, error };
}
