import { api } from './client';

export interface CVParseRes {
  cv_upload: { id: string; file_url: string };
  extraction: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    skills: string[];
    summary: string;
    education: string;
    experience: string;
    certifications: string;
    languages: string[];
  };
  profile_suggestion: {
    type: 'intern' | 'candidate';
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  raw_text: string;
  debug?: string;
}

export const uploadAndParseCV = async (file: File): Promise<CVParseRes> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<CVParseRes>('/cv/upload', formData);
  return res.data;
};

export const extractCV = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/cv/public-extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};
