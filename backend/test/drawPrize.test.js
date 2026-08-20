const test = require('node:test');
const assert = require('node:assert');

const { drawPrize } = require('../src/domain/services/drawPrize');

test('weight 비율(1, 5, 94)로 다수 시행 시 분포가 대략 비례한다', () => {
  const prizes = [
    { name: 'A', weight: 1 },
    { name: 'B', weight: 5 },
    { name: 'C', weight: 94 },
  ];
  const TRIALS = 20000;
  const counts = { A: 0, B: 0, C: 0 };
  for (let i = 0; i < TRIALS; i++) {
    counts[drawPrize(prizes).name] += 1;
  }

  assert.ok(Math.abs(counts.A / TRIALS - 0.01) < 0.02, `A 비율: ${counts.A / TRIALS}`);
  assert.ok(Math.abs(counts.B / TRIALS - 0.05) < 0.03, `B 비율: ${counts.B / TRIALS}`);
  assert.ok(Math.abs(counts.C / TRIALS - 0.94) < 0.03, `C 비율: ${counts.C / TRIALS}`);
});

test('weight가 0 또는 음수인 경품이 있으면 예외를 던진다', () => {
  assert.throws(() => drawPrize([{ name: 'A', weight: 0 }]));
  assert.throws(() => drawPrize([{ name: 'A', weight: -1 }]));
});

test('경품 목록이 비어 있으면 예외를 던진다', () => {
  assert.throws(() => drawPrize([]));
});
