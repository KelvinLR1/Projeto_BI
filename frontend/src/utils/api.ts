// Memória cache global no lado do cliente
const cache: Record<string, any> = {};
const pendingPromises: Record<string, Promise<any> | undefined> = {};

// Chaveador único para cache, incluindo método e corpo (se houver)
const getCacheKey = (url: string, options?: RequestInit) => {
  if (options?.body) {
    return `${options.method || 'GET'}:${url}:${String(options.body)}`;
  }
  return `${options?.method || 'GET'}:${url}`;
};

/**
 * Função utilitária de fetch com cache (Stale-While-Revalidate).
 * - Se os dados já existem no cache, chama imediatamente o callback `onData` de forma síncrona.
 * - Dispara a requisição em segundo plano para atualizar o cache e chama `onData` novamente quando retornar.
 * - Se for uma requisição de alteração (POST/PUT/DELETE que não seja /api/scripts/execute), limpa o cache correspondente.
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  onData?: (data: T) => void
): Promise<T> {
  const method = options?.method || 'GET';
  const isQueryExecute = url.includes('/api/scripts/execute');
  const isCacheable = method === 'GET' || (method === 'POST' && isQueryExecute);

  const cacheKey = getCacheKey(url, options);

  // Invalida o cache se for uma requisição de mutação
  if (!isCacheable) {
    // Limpa todo o cache de layouts, scripts e settings para evitar dados obsoletos
    Object.keys(cache).forEach(key => {
      delete cache[key];
    });
  }

  // Se já temos os dados em cache e for uma consulta cacheável, entrega imediatamente
  if (isCacheable && cache[cacheKey] !== undefined) {
    if (onData) {
      onData(cache[cacheKey]);
    }
  }

  // Se já há um fetch idêntico em andamento, aguarda por ele
  if (isCacheable && pendingPromises[cacheKey]) {
    try {
      const data = await pendingPromises[cacheKey];
      if (onData) onData(data);
      return data;
    } catch (e) {
      // Ignora erro do cache reusado e faz novo request se necessário
    }
  }

  // Cria a promessa de requisição
  const fetchPromise = (async () => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (isCacheable) {
      cache[cacheKey] = data;
    }
    return data;
  })();

  if (isCacheable) {
    pendingPromises[cacheKey] = fetchPromise;
  }

  try {
    const data = await fetchPromise;
    if (isCacheable) {
      delete pendingPromises[cacheKey];
    }
    if (onData) {
      onData(data);
    }
    return data;
  } catch (error) {
    if (isCacheable) {
      delete pendingPromises[cacheKey];
    }
    throw error;
  }
}

/**
 * Limpa todo o cache de requisições armazenado em memória.
 */
export function clearCache() {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
}

