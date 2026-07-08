import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Empresa do usuário logado. Usa React Query para cachear o resultado entre
// navegações — assim as páginas não refazem me()+Company.filter() a cada troca
// de tela (o que causava a "piscada" de loading). O `user` vem do AuthContext,
// que já o mantém carregado.
export function useCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const email = user?.email;

  const { data: company = null, isLoading } = useQuery({
    queryKey: ['company', email],
    enabled: !!email,
    staleTime: Infinity, // a empresa raramente muda em runtime
    queryFn: async () => {
      const companies = await base44.entities.Company.filter({ owner_email: email });
      return companies.length > 0 ? companies[0] : null;
    },
  });

  const setCompany = (next) => {
    queryClient.setQueryData(['company', email], next);
  };

  // `loading` só é true enquanto realmente busca; com cache, navegações
  // seguintes retornam de imediato (isLoading = false).
  return { company, user, loading: !!email && isLoading, setCompany };
}
