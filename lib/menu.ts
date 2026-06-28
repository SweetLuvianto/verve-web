// Public menu showcase content (owner-authored, English, display-only prices).
// Static — renders even when the venue is offline; the most shareable link.
import type { MenuItem } from "./snapshot";

export const TT_MENU: MenuItem[] = [
  { category: "Starters", name: "Garden Caesar Salad", description: "Crisp romaine, shaved parmesan, herbed croutons.", price: "L$ 120" },
  { category: "Starters", name: "Velvet Tomato Soup", description: "Slow-roasted tomato, basil cream.", price: "L$ 90" },
  { category: "Mains", name: "Hearth Pasta Cream", description: "Hand-rolled tagliatelle, wild mushroom, truffle cream.", price: "L$ 240" },
  { category: "Mains", name: "Garden Grill Plate", description: "Seasonal vegetables, charred lemon, olive oil.", price: "L$ 220" },
  { category: "Drinks", name: "House Red Wine", description: "A smooth, candlelit-evening red.", price: "L$ 80" },
  { category: "Drinks", name: "Velvet Coffee", description: "Single-origin, slow pour.", price: "L$ 50" },
  { category: "Desserts", name: "Caramel Custard", description: "Silky custard, burnt-sugar crown.", price: "L$ 110" },
];
