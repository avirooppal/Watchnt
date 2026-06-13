import { useState, useEffect } from 'react';
import api from '../../storage/api.js';

export function useCards(filters) {
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setCards([]);
  }, [filters.type, filters.tag, filters.lang, filters.q]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (filters.type) query.set('contentType', filters.type);
        if (filters.tag) query.set('tag', filters.tag);
        if (filters.lang) query.set('lang', filters.lang);
        if (filters.q) query.set('q', filters.q);
        query.set('page', page);

        const res = await api.get(`/cards?${query.toString()}`);
        if (active) {
          if (page === 1) {
            setCards(res.cards || []);
          } else {
            setCards(prev => [...prev, ...(res.cards || [])]);
          }
          setTotal(res.total || 0);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [filters.type, filters.tag, filters.lang, filters.q, page]);

  const loadMore = () => setPage(p => p + 1);

  return { cards, total, loading, error, loadMore };
}
