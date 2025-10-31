// Barrows Equipment Repair recipes
// Format: { itemSet: repairedItemId, itemsToCreateSet: [brokenItemId], conversionCost: repairCost }
// Repair costs are based on degradation level (0-100)
// Costs shown are for fully degraded items (100% degradation)
// Reference: https://oldschool.runescape.wiki/w/Barrows_equipment#Repairing
// Repair cost formula: baseCost * (degradation / 100)
// For display, we'll show the cost to repair from 100% degraded (max cost)

// Barrows sets: Ahrim, Dharok, Guthan, Karil, Torag, Verac
// Each set has: Helmet, Body, Legs, Weapon
// Repair costs: Helmets=60,000, Bodies=90,000, Legs=80,000, Weapons=100,000

export const barrowsRepairRecipes = [
  // Ahrim's
  { itemSet: 4708, itemsToCreateSet: [4860], conversionCost: 60000 }, // Ahrim's hood (helmet)
  { itemSet: 4712, itemsToCreateSet: [4866], conversionCost: 90000 }, // Ahrim's robetop (body)
  { itemSet: 4714, itemsToCreateSet: [4868], conversionCost: 80000 }, // Ahrim's robeskirt (legs)
  { itemSet: 4710, itemsToCreateSet: [4862], conversionCost: 100000 }, // Ahrim's staff (weapon)
  
  // Dharok's
  { itemSet: 4716, itemsToCreateSet: [4880], conversionCost: 60000 }, // Dharok's helm (helmet)
  { itemSet: 4720, itemsToCreateSet: [4886], conversionCost: 90000 }, // Dharok's platebody (body)
  { itemSet: 4722, itemsToCreateSet: [4888], conversionCost: 80000 }, // Dharok's platelegs (legs)
  { itemSet: 4718, itemsToCreateSet: [4882], conversionCost: 100000 }, // Dharok's greataxe (weapon)
  
  // Guthan's
  { itemSet: 4724, itemsToCreateSet: [4904], conversionCost: 60000 }, // Guthan's helm (helmet)
  { itemSet: 4728, itemsToCreateSet: [4910], conversionCost: 90000 }, // Guthan's platebody (body)
  { itemSet: 4730, itemsToCreateSet: [4912], conversionCost: 80000 }, // Guthan's chainskirt (legs)
  { itemSet: 4726, itemsToCreateSet: [4906], conversionCost: 100000 }, // Guthan's warspear (weapon)
  
  // Karil's
  { itemSet: 4732, itemsToCreateSet: [4932], conversionCost: 60000 }, // Karil's coif (helmet)
  { itemSet: 4736, itemsToCreateSet: [4938], conversionCost: 90000 }, // Karil's leathertop (body)
  { itemSet: 4738, itemsToCreateSet: [4940], conversionCost: 80000 }, // Karil's leatherskirt (legs)
  { itemSet: 4734, itemsToCreateSet: [4934], conversionCost: 100000 }, // Karil's crossbow (weapon)
  
  // Torag's
  { itemSet: 4745, itemsToCreateSet: [4958], conversionCost: 60000 }, // Torag's helm (helmet)
  { itemSet: 4749, itemsToCreateSet: [4964], conversionCost: 90000 }, // Torag's platebody (body)
  { itemSet: 4751, itemsToCreateSet: [4966], conversionCost: 80000 }, // Torag's platelegs (legs)
  { itemSet: 4747, itemsToCreateSet: [4960], conversionCost: 100000 }, // Torag's hammers (weapon)
  
  // Verac's
  { itemSet: 4753, itemsToCreateSet: [4978], conversionCost: 60000 }, // Verac's helm (helmet)
  { itemSet: 4757, itemsToCreateSet: [4984], conversionCost: 90000 }, // Verac's brassard (body)
  { itemSet: 4759, itemsToCreateSet: [4986], conversionCost: 80000 }, // Verac's plateskirt (legs)
  { itemSet: 4755, itemsToCreateSet: [4980], conversionCost: 100000 } // Verac's flail (weapon)
]

