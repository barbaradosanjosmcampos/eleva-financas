import { useState } from 'react';
import type { FinanceData } from '../types';
import { createDemo } from '../lib/demo';
const KEY = 'eleva-financas-v1';
function valid(data: unknown): data is FinanceData {
 if (!data || typeof data !== 'object') return false;
 const d = data as FinanceData;
 return Array.isArray(d.transactions) && Array.isArray(d.assets) && Array.isArray(d.goals)
 && d.transactions.every(t => typeof t.id === 'string' && typeof t.description === 'string' && typeof t.category === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && ['income','expense'].includes(t.type) && Number.isFinite(t.amount) && t.amount > 0)
 && d.assets.every(a => typeof a.id === 'string' && typeof a.name === 'string' && typeof a.category === 'string' && Number.isFinite(a.invested) && a.invested > 0 && Number.isFinite(a.current) && a.current >= 0)
 && d.goals.every(g => typeof g.id === 'string' && typeof g.name === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) && Number.isFinite(g.target) && g.target > 0 && Number.isFinite(g.saved) && g.saved >= 0);
}
export function useFinances() {
 const [warning, setWarning] = useState('');
 const [data, setData] = useState<FinanceData>(() => {
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (valid(parsed)) return parsed; } } catch { /* Fall back to demo; saving reports storage problems. */ }
  return createDemo();
 });
 const update = (next: FinanceData) => {
  setData(next);
  try { localStorage.setItem(KEY, JSON.stringify(next)); setWarning(''); }
  catch { setWarning('Não foi possível salvar neste navegador. As alterações serão mantidas somente enquanto esta página estiver aberta.'); }
 };
 return { data, update, warning };
}
