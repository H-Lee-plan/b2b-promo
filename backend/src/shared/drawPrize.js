function drawPrize(prizes) {
  if (!Array.isArray(prizes) || prizes.length < 1) {
    throw new Error('추첨할 경품이 없습니다.');
  }
  for (const prize of prizes) {
    if (!Number.isInteger(prize.weight) || prize.weight < 1) {
      throw new Error('weight는 1 이상 정수여야 합니다.');
    }
  }

  const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll < 0) return prize;
  }
  return prizes[prizes.length - 1];
}

module.exports = { drawPrize };
