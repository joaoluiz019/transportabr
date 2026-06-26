import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useCompany() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const companies = await base44.entities.Company.filter({ owner_email: me.email });
        if (companies.length > 0) {
          setCompany(companies[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { company, user, loading, setCompany };
}