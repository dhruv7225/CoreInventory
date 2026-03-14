import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosClient';

/**
 * useFetch wrapper mapped to @tanstack/react-query
 * Helps migrate custom hooks easily to the standard fetcher.
 */
export default function useFetch(url, options = {}) {
  const { params, skip = false } = options;

  const queryKey = [url, params].filter(Boolean);

  const {
    data,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get(url, { params });
      return data;
    },
    enabled: !skip,
  });

  return {
    data,
    loading,
    error: error?.response?.data?.detail || error?.message || null,
    refetch,
  };
}
