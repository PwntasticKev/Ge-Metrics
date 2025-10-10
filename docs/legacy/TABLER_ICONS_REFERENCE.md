# 🎯 TABLER ICONS REFERENCE - CRITICAL REMINDER

## ⚠️ ALWAYS CHECK ICON EXISTENCE BEFORE IMPORTING

**NEVER assume an icon exists!** Always verify at: https://tabler.io/icons

## 🚫 COMMON NON-EXISTENT ICONS (DO NOT USE):
- `IconFormula` ❌ (Use `IconMathSymbols` instead)
- `IconAlgorithm` ❌ (Use `IconBrain` or `IconMath` instead)
- `IconEquation` ❌ (Use `IconMathSymbols` instead)
- `IconCode` ❌ (Use `IconCodeDots` instead)
- `IconDatabase` ❌ (Use `IconDatabase` - wait, this one exists!)

## ✅ VERIFIED MATH/FORMULA RELATED ICONS:
- `IconMathSymbols` ✅ - For formulas, equations, mathematical operations
- `IconCalculator` ✅ - For calculations, computing
- `IconMath` ✅ - General math operations
- `IconBrain` ✅ - For AI, algorithms, intelligence
- `IconChartLine` ✅ - For analytics, trends
- `IconTarget` ✅ - For goals, objectives

## ✅ COMMONLY USED ICONS IN OUR PROJECT:
- `IconDashboard` ✅
- `IconUsers` ✅
- `IconSettings` ✅
- `IconCoins` ✅
- `IconTrendingUp` ✅
- `IconShield` ✅
- `IconHome` ✅
- `IconEye` ✅
- `IconBookmark` ✅
- `IconCrystalBall` ✅
- `IconDiamond` ✅

## 🔧 HOW TO VERIFY ICON EXISTS:
1. Go to https://tabler.io/icons
2. Search for the icon name
3. Copy the exact import name from the React tab
4. Import format: `import { IconName } from '@tabler/icons-react'`

## 🚨 IMPORT ERROR SYMPTOMS:
```
Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/@tabler_icons-react.js?v=a1c5457f' does not provide an export named 'IconFormula'
```

## 🛠️ FIX PROCESS:
1. Identify the non-existent icon name in error
2. Find alternative icon at https://tabler.io/icons
3. Replace import and usage throughout codebase
4. Test that server starts without errors

## 📝 CURRENT PROJECT ICON REPLACEMENTS:
- `IconFormula` → `IconMathSymbols` (Formula Documentation)

## 🎯 REMEMBER:
- **ALWAYS verify icon exists before using**
- **Search Tabler Icons website first**
- **Use semantic alternatives when exact icon doesn't exist**
- **Update this reference when finding new working/non-working icons**

---
*Last Updated: January 2025*
*Keep this file updated to prevent future icon import errors!* 