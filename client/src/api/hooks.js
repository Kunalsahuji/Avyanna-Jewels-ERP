import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from './http';

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: async () => (await http.get('/users')).data.data });

export const useDashboard = (params) =>
  useQuery({ queryKey: ['dashboard', params], queryFn: async () => (await http.get('/dashboard', { params })).data.data });

// Generic hooks shared by delegations / checklists / tickets
export const useList = (resource, params) =>
  useQuery({
    queryKey: [resource, 'list', params],
    queryFn: async () => (await http.get(`/${resource}`, { params })).data,
    placeholderData: (prev) => prev,
  });

export const useStats = (resource, params) =>
  useQuery({
    queryKey: [resource, 'stats', params],
    queryFn: async () => (await http.get(`/${resource}/stats`, { params })).data.data,
  });

export const usePerPerson = (resource, params) =>
  useQuery({
    queryKey: [resource, 'per-person', params],
    queryFn: async () => (await http.get(`/${resource}/per-person`, { params })).data.data,
  });

export function useResourceMutation(resource) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: [resource] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: (body) => http.post(`/${resource}`, body), onSuccess: refresh }),
    act: useMutation({ mutationFn: ({ id, action, body }) => http.post(`/${resource}/${id}/${action}`, body), onSuccess: refresh }),
    complete: useMutation({ mutationFn: ({ id, body }) => http.post(`/${resource}/${id}/complete`, body), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, body }) => http.patch(`/${resource}/${id}`, body), onSuccess: refresh }),
    updateRemark: useMutation({ mutationFn: ({ id, mdRemark }) => http.patch(`/${resource}/${id}/remark`, { mdRemark }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id) => http.delete(`/${resource}/${id}`), onSuccess: refresh }),
  };
}
