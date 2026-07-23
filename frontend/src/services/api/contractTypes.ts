import { api } from './client';

export type ContractType = { id: string; name: string; description?: string; is_active?: boolean };

export const listContractTypes = () =>
  api.get<ContractType[]>('/contract-types').then(r => r.data);

export const createContractType = (body: { name: string; description?: string }) =>
  api.post<ContractType>('/contract-types', body).then(r => r.data);

export const updateContractType = (id: string, body: { name?: string; description?: string; is_active?: boolean }) =>
  api.patch<ContractType>(`/contract-types/${id}`, body).then(r => r.data);

export const deleteContractType = (id: string) =>
  api.delete(`/contract-types/${id}`);
