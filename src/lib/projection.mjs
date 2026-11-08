export function project(initial, monthly, annualRate, years) {
  const rate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let balance = initial;
  const result = [{ year: 0, invested: initial, balance }];
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + rate) + monthly;
    if (month % 12 === 0)
      result.push({
        year: month / 12,
        invested: initial + monthly * month,
        balance,
      });
  }
  return result;
}
