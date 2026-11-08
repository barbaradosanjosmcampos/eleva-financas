export const money = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
export const percent = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n) + '%';
export const today = () => new Date().toLocaleDateString('en-CA');
export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const dateLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
