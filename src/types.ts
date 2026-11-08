export type Transaction = { id: string; description: string; amount: number; type: 'income' | 'expense'; category: string; date: string };
export type Asset = { id: string; name: string; category: string; invested: number; current: number };
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string };
export type FinanceData = { transactions: Transaction[]; assets: Asset[]; goals: Goal[] };
export type Page = 'dashboard' | 'transactions' | 'investments' | 'goals' | 'simulator';
