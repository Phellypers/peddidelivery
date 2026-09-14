export const UNITS = ['unidade', 'pacote', 'grama', 'quilo', 'ml', 'litro'];

export const UNIT_LABELS = {
  unidade: 'un',
  pacote: 'pct',
  grama: 'g',
  quilo: 'kg',
  ml: 'ml',
  litro: 'L',
};

// Base units: unidade (for unidade/pacote), grama (for grama/quilo), ml (for ml/litro)
function convertToBase(quantity, unit, packSize = 1) {
  switch (unit) {
    case 'pacote': return quantity * (packSize || 1);
    case 'quilo': return quantity * 1000;
    case 'litro': return quantity * 1000;
    default: return quantity;
  }
}

function convertFromBase(baseQuantity, unit, packSize = 1) {
  switch (unit) {
    case 'pacote': return baseQuantity / (packSize || 1);
    case 'quilo': return baseQuantity / 1000;
    case 'litro': return baseQuantity / 1000;
    default: return baseQuantity;
  }
}

// Cost per base unit of an ingredient
export function getUnitCost(ingredient) {
  if (!ingredient) return 0;
  const packSize = ingredient.pack_size || 1;
  const totalBase = convertToBase(ingredient.quantity_purchased || 0, ingredient.unit, packSize);
  if (totalBase === 0) return 0;
  return (ingredient.cost || 0) / totalBase;
}

// Cost of a single recipe item based on its ingredient
export function calculateRecipeItemCost(recipeItem, ingredient) {
  if (!ingredient || !recipeItem || !recipeItem.ingredient_id) return 0;
  const packSize = ingredient.pack_size || 1;
  const unitCost = getUnitCost(ingredient);
  const recipeBase = convertToBase(recipeItem.quantity || 0, recipeItem.unit || ingredient.unit, packSize);
  return unitCost * recipeBase;
}

// Total cost of a recipe
export function calculateRecipeCost(recipe, ingredients) {
  if (!recipe || !ingredients) return 0;
  return recipe.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingredient_id);
    return sum + calculateRecipeItemCost(item, ing);
  }, 0);
}

// Stock deduction in the ingredient's own unit
export function getStockDeduction(recipeItem, ingredient) {
  if (!ingredient || !recipeItem) return 0;
  const packSize = ingredient.pack_size || 1;
  const recipeBase = convertToBase(recipeItem.quantity || 0, recipeItem.unit || ingredient.unit, packSize);
  return convertFromBase(recipeBase, ingredient.unit, packSize);
}