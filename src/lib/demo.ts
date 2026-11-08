import type { FinanceData } from '../types';
import { monthKey } from './format';
export function createDemo(): FinanceData {
 const transactions: FinanceData['transactions'] = [];
 for (let offset = 5; offset >= 0; offset--) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offset); const m = monthKey(d);
  const entries = [ ['Salário', 8500, 'income', 'Salário', '05'], ['Projeto freelance', 1800 - offset * 120, 'income', 'Trabalho extra', '12'], ['Aluguel', 2200, 'expense', 'Moradia', '08'], ['Supermercado', 780 + offset * 45, 'expense', 'Alimentação', '15'], ['Mobilidade', 360, 'expense', 'Transporte', '18'], ['Restaurante e lazer', 540 + offset * 60, 'expense', 'Lazer', '20'], ['Internet e serviços', 290, 'expense', 'Contas', '10'] ] as const;
  entries.forEach(([description, amount, type, category, day], i) => transactions.push({id:`demo-${offset}-${i}`, description, amount, type, category, date:`${m}-${day}`}));
 }
 return { transactions, assets: [ {id:'a1', name:'Tesouro IPCA+ 2029', category:'Renda fixa', invested:22000, current:24500}, {id:'a2',name:'CDB liquidez diária',category:'Renda fixa',invested:15000,current:16200}, {id:'a3',name:'ETF de índice',category:'Renda variável',invested:10000,current:11300}, {id:'a4',name:'Fundo imobiliário',category:'Fundos imobiliários',invested:8000,current:8500}], goals: [{id:'g1',name:'Reserva de emergência',target:30000,saved:22500,deadline:'2027-06-30'}, {id:'g2',name:'Viagem dos sonhos',target:15000,saved:5400,deadline:'2027-12-01'}, {id:'g3',name:'Entrada do apartamento',target:120000,saved:18000,deadline:'2030-12-01'}] };
}
