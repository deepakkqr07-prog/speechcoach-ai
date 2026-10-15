const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend offline');
    return res.json();
  },

  // Analysis
  analyzeSpeech: async (formData) => {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis request failed');
    }
    return res.json();
  },

  transcribeAudio: async (formData) => {
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  },

  alignAudio: async (formData) => {
    const res = await fetch(`${API_BASE}/align`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Alignment failed');
    return res.json();
  },

  // History
  getHistory: async () => {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  getAnalysisDetail: async (id) => {
    const res = await fetch(`${API_BASE}/history/${id}`);
    if (!res.ok) throw new Error('Analysis detail not found');
    return res.json();
  },

  deleteAnalysis: async (id) => {
    const res = await fetch(`${API_BASE}/history/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete analysis');
    return res.json();
  },

  compareAnalyses: async (id1, id2) => {
    const res = await fetch(`${API_BASE}/history/compare/${id1}/${id2}`);
    if (!res.ok) throw new Error('Failed to compare analyses');
    return res.json();
  },

  // Dataset
  getDataset: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/dataset${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch dataset');
    return res.json();
  },

  getSampleDetail: async (sampleId) => {
    const res = await fetch(`${API_BASE}/dataset/${sampleId}`);
    if (!res.ok) throw new Error('Failed to fetch sample');
    return res.json();
  },

  getExportDatasetUrl: (format = 'json') => {
    return `${API_BASE}/dataset/export?format=${format}`;
  },

  // Rubric
  getRubric: async () => {
    const res = await fetch(`${API_BASE}/rubric`);
    if (!res.ok) throw new Error('Failed to fetch rubric');
    return res.json();
  },

  updateRubric: async (rubric) => {
    const res = await fetch(`${API_BASE}/rubric`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rubric),
    });
    if (!res.ok) throw new Error('Failed to update rubric');
    return res.json();
  },

  resetRubric: async () => {
    const res = await fetch(`${API_BASE}/rubric/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset rubric');
    return res.json();
  },

  getAudioUrl: (urlOrPath) => {
    if (!urlOrPath) return '';
    if (urlOrPath.startsWith('http')) return urlOrPath;
    if (urlOrPath.startsWith('/api')) return urlOrPath;
    return `/api/audio/${urlOrPath}`;
  }
};
