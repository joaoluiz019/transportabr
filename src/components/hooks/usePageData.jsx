import { useQuery, useQueryClient } from '@tanstack/react-query';

// Busca cacheada dos dados de uma página, keyed pela empresa. Evita o spinner
// ("piscada") a cada navegação: a primeira visita busca, as revisitas usam o
// cache e revalidam em segundo plano (stale-while-revalidate).
//
// `key`      identificador estável da página (ex.: 'vehicles').
// `company`  empresa atual; a query só roda quando ela existe.
// `queryFn`  função assíncrona que retorna um objeto com as coleções da página.
export function usePageData(key, company, queryFn) {
  const queryClient = useQueryClient();
  const queryKey = [key, company?.id];

  const { data, isPending, refetch } = useQuery({
    queryKey,
    enabled: !!company,
    // staleTime 0 = stale-while-revalidate: a revisita renderiza o cache
    // imediatamente (sem spinner/piscada) e revalida em segundo plano, então os
    // dados continuam sempre atualizados (ex.: um veículo novo aparece nos
    // selects de outras páginas). O cache sobrevive à desmontagem via gcTime.
    staleTime: 0,
    queryFn,
  });

  // Cria um setter otimista para um campo do objeto de dados, compatível com o
  // padrão `setX(prev => ...)` já usado nas mutações das páginas — assim os
  // call sites existentes continuam funcionando sem alteração.
  const makeSetter = (field) => (updater) =>
    queryClient.setQueryData(queryKey, (old) => {
      const current = old?.[field] ?? [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...(old ?? {}), [field]: next };
    });

  return { data, isPending, refetch, makeSetter };
}
