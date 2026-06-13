const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ── Mock cafeteria data ───────────────────────────────────────────────────────
const weeklyMenu = {
  Monday: {
    breakfast: ["Idli Sambar", "Masala Dosa", "Tea/Coffee", "Fresh Fruit"],
    lunch: ["Rice", "Dal Tadka", "Paneer Butter Masala", "Roti", "Mixed Vegetable Curry", "Curd"],
    dinner: ["Chapati", "Rajma", "Jeera Rice", "Salad Bar", "Sweet: Gulab Jamun"],
    specials: ["Monday Special: Extra Dessert for students with ID"],
  },
  Tuesday: {
    breakfast: ["Poha", "Upma", "Boiled Eggs", "Tea/Coffee"],
    lunch: ["Biryani (Veg/Chicken)", "Raita", "Papad", "Lassi"],
    dinner: ["Noodles", "Manchurian", "Spring Rolls", "Sweet Corn Soup"],
    specials: ["Biryani Tuesday — Special price ₹80"],
  },
  Wednesday: {
    breakfast: ["Paratha with Pickle", "Chole Bhature", "Tea/Coffee"],
    lunch: ["Rice", "Sambar", "Rasam", "Potato Fry", "Appalam"],
    dinner: ["Pasta Arrabiata", "Garlic Bread", "Caesar Salad", "Fruit Custard"],
    specials: ["South Indian Special Day"],
  },
  Thursday: {
    breakfast: ["Idli Sambar", "Puri Bhaji", "Tea/Coffee"],
    lunch: ["Chole Rice", "Kadhi Pakora", "Roti", "Green Salad"],
    dinner: ["Dal Makhani", "Naan", "Paneer Tikka", "Kheer"],
    specials: ["Paneer Thursday — Extra paneer portions"],
  },
  Friday: {
    breakfast: ["Rava Dosa", "Medu Vada", "Coconut Chutney", "Tea/Coffee"],
    lunch: ["Pulao", "Mixed Dal", "Aloo Gobi", "Buttermilk"],
    dinner: ["Pizza (Veg/Non-Veg)", "Pasta", "Cold Coffee"],
    specials: ["Friday Treat: Free dessert with full meal combo"],
  },
  Saturday: {
    breakfast: ["Pav Bhaji", "Bread Omelette", "Tea/Coffee"],
    lunch: ["Fried Rice", "Manchurian", "Spring Rolls", "Soup"],
    dinner: ["BBQ Night — Grilled items, Kebabs, Salads"],
    specials: ["Weekend Special: BBQ available from 7PM"],
  },
  Sunday: {
    breakfast: ["Full English / South Indian Combo", "Fresh Juice"],
    lunch: ["Chole Bhature", "Dal Fry", "Rice", "Papad", "Sweet"],
    dinner: ["Mughlai Special: Biryani, Kebabs, Shahi Paneer, Seviyan"],
    specials: ["Sunday Brunch 10AM–1PM: Extended breakfast menu"],
  },
};

const hours = {
  breakfast: "7:30 AM – 9:30 AM",
  lunch: "12:00 PM – 2:30 PM",
  snacks: "4:30 PM – 6:00 PM",
  dinner: "7:30 PM – 9:30 PM",
  note: "Cafeteria closed on national holidays. Sunday brunch: 10AM–1PM.",
};

function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

// ── MCP Tool Definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_menu",
    description: "Get the cafeteria menu for today or a specific day",
    inputSchema: {
      type: "object",
      properties: {
        day: { type: "string", description: "Day of week (Monday–Sunday), defaults to today" },
        meal: { type: "string", enum: ["breakfast", "lunch", "dinner", "all"], description: "Which meal to show" },
      },
    },
  },
  {
    name: "get_specials",
    description: "Get today's or this week's special offers and discounts",
    inputSchema: {
      type: "object",
      properties: {
        day: { type: "string", description: "Day of week, defaults to today" },
      },
    },
  },
  {
    name: "get_hours",
    description: "Get cafeteria opening and closing hours",
    inputSchema: { type: "object", properties: {} },
  },
];

// ── Tool Handlers ─────────────────────────────────────────────────────────────
function getMenu({ day, meal }) {
  const targetDay = day || getTodayName();
  const menu = weeklyMenu[targetDay];
  if (!menu) return { error: `No menu found for ${targetDay}` };
  if (meal && meal !== "all") {
    return { day: targetDay, meal, items: menu[meal] || [] };
  }
  return { day: targetDay, menu };
}

function getSpecials({ day }) {
  const targetDay = day || getTodayName();
  const menu = weeklyMenu[targetDay];
  if (!menu) return { error: `No specials found for ${targetDay}` };
  return { day: targetDay, specials: menu.specials };
}

function getHours() {
  return { hours };
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/mcp/manifest", (req, res) => {
  res.json({
    server: "cafeteria",
    displayName: "Campus Cafeteria",
    description: "Get daily menus, specials, and cafeteria hours",
    version: "1.0.0",
    tools: TOOLS,
  });
});

app.post("/mcp/invoke", (req, res) => {
  const { tool, input } = req.body;
  try {
    let result;
    switch (tool) {
      case "get_menu": result = getMenu(input || {}); break;
      case "get_specials": result = getSpecials(input || {}); break;
      case "get_hours": result = getHours(); break;
      default: return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
    res.json({ success: true, tool, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", server: "cafeteria" }));

app.listen(PORT, () => console.log(`🍽️  Cafeteria MCP Server running on :${PORT}`));
