// Dice engine — parse, roll, format dice formulas
// Pattern: 1d6, 2d8+3, 1d20-1, 3d10+5
const DICE_REGEX = /(\d+)d(\d+)([+-]\d+)?/;

export function containsDiceFormula(text) {
  return DICE_REGEX.test(text || '');
}

export function extractDiceFormula(text) {
  const match = (text || '').match(DICE_REGEX);
  return match ? match[0] : null;
}

export function rollDice(formula) {
  const match = formula.match(DICE_REGEX);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  const dice = [];
  for (let i = 0; i < count; i++) {
    dice.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = dice.reduce((a, b) => a + b, 0) + modifier;
  return { formula, dice, modifier, total, timestamp: Date.now() };
}

export function formatDiceResult(result) {
  if (!result) return '';
  const { formula, dice, modifier, total } = result;
  const diceStr = dice.join('+');
  if (modifier !== 0) {
    const modStr = modifier > 0 ? `+${modifier}` : String(modifier);
    return `${formula} = ${total} (${diceStr}${modStr})`;
  }
  if (dice.length === 1) return `${formula} = ${total}`;
  return `${formula} = ${total} (${diceStr})`;
}
