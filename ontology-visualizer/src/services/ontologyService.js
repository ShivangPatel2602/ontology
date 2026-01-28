import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const fetchOntologies = async () => {
  const response = await axios.get(`${API_URL}/ontologies`);
  return response.data;
};

export const fetchOntologyHierarchy = async (cvId) => {
  const response = await axios.get(`${API_URL}/ontologies/${cvId}/hierarchy`);
  return response.data;
};

export const testApiConnection = async () => {
  const response = await axios.get(`${API_URL}/test`);
  return response.data;
};