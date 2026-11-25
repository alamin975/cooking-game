// Recipes and ingredients for Rush Hour Kitchen.
// Every recipe is a list of steps. A step names an ingredient and, when the
// ingredient needs prep, the station that prepares it: grill or board.
// "bun" is the base and the lid; a recipe always starts and ends with a bun.

export const INGREDIENTS = {
  bun: { name: 'Bun', color: '#e8a54b', dark: '#c47f2e', prep: null, key: 'B' },
  patty: { name: 'Patty', color: '#8a5a3b', dark: '#6b4229', prep: 'grill', key: 'P' },
  lettuce: { name: 'Lettuce', color: '#7bc043', dark: '#4e8f2a', prep: 'board', key: 'L' },
  tomato: { name: 'Tomato', color: '#e4572e', dark: '#b23a1d', prep: 'board', key: 'T' },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d9a41f', prep: null, key: 'C' },
};

export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    price: 100,
    steps: ['bun', 'patty', 'lettuce', 'cheese', 'bun'],
  },
  {
    id: 'melt',
    name: 'Cheese Melt',
    price: 120,
    steps: ['bun', 'patty', 'cheese', 'cheese', 'bun'],
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    price: 90,
    steps: ['bun', 'lettuce', 'tomato', 'cheese', 'bun'],
  },
  {
    id: 'double',
    name: 'Double Trouble',
    price: 160,
    steps: ['bun', 'patty', 'patty', 'cheese', 'bun'],
  },
];

// How long each prep station takes, in milliseconds.
export const PREP_TIME = { grill: 3000, board: 2000 };

// An order lives this long before it expires, in milliseconds.
export const ORDER_TTL = 22000;
