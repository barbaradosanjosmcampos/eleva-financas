import test from 'node:test';
import assert from 'node:assert/strict';
import { project } from '../src/lib/projection.mjs';
test('taxa zero preserva o capital e soma aportes mensais', () => {
 const result = project(1000, 100, 0, 2);
 assert.equal(result.length, 3);
 assert.equal(result.at(-1).balance, 3400);
 assert.equal(result.at(-1).invested, 3400);
});
test('taxa anual efetiva equivale ao crescimento anual sem aportes', () => {
 assert.ok(Math.abs(project(1000, 0, 10, 2).at(-1).balance - 1210) < 0.00001);
});
test('aportes ocorrem no fim do mês', () => {
 const rate = Math.pow(1.12, 1 / 12) - 1;
 const expected = 500 * ((Math.pow(1 + rate, 12) - 1) / rate);
 assert.ok(Math.abs(project(0, 500, 12, 1).at(-1).balance - expected) < 0.00001);
});
test('retorno negativo reduz o saldo sem gerar valores inválidos', () => {
 const result = project(1000, 0, -20, 1).at(-1);
 assert.ok(Math.abs(result.balance - 800) < 0.00001);
});
