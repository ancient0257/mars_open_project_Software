const express = require("express");
const cors    = require("cors");
const app     = express();

const CORS_OPTS = { origin: process.env.FRONTEND_URL || "*", methods: ["GET","POST"] };
app.use(cors(CORS_OPTS));
app.use(express.json({ limit: "16kb" }));
app.use((_, res, next) => { res.setHeader("X-Content-Type-Options","nosniff"); res.setHeader("X-Frame-Options","DENY"); next(); });

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const WEEKLY_MENU = {
  Monday:    { breakfast:["Poha","Boiled Eggs (2)","Banana","Tea / Coffee","Bread & Butter"], lunch:["Dal Tadka","Jeera Rice","Mixed Veg Sabzi","Chapati (3)","Curd","Papad"], snacks:["Samosa (2)","Chai"], dinner:["Rajma","Steamed Rice","Aloo Gobhi","Chapati (3)","Salad","Sweet – Kheer"] },
  Tuesday:   { breakfast:["Upma","Boiled Eggs (2)","Apple","Tea / Coffee","Bread & Butter"], lunch:["Chana Masala","Plain Rice","Bhindi Fry","Chapati (3)","Raita","Salad"], snacks:["Bread Pakora (2)","Chai"], dinner:["Dal Makhani","Jeera Rice","Paneer Butter Masala","Chapati (3)","Salad","Sweet – Gajar Halwa"] },
  Wednesday: { breakfast:["Idli Sambhar (3)","Coconut Chutney","Banana","Tea / Coffee"], lunch:["Yellow Dal","Plain Rice","Aloo Matar","Chapati (3)","Curd","Papad"], snacks:["Vada Pav","Chai"], dinner:["Kadhi Pakoda","Steamed Rice","Soya Chunks Curry","Chapati (3)","Salad","Sweet – Ras Malai"] },
  Thursday:  { breakfast:["Poha","Boiled Eggs (2)","Orange","Tea / Coffee","Bread & Butter"], lunch:["Moong Dal","Jeera Rice","Cauliflower Dry","Chapati (3)","Raita","Salad"], snacks:["Kachori (2)","Chai"], dinner:["Chole","Bhature","Mixed Veg","Chapati (2)","Salad","Sweet – Gulab Jamun"] },
  Friday:    { breakfast:["Dosa (2)","Sambhar","Coconut Chutney","Tea / Coffee"], lunch:["Arhar Dal","Plain Rice","Palak Paneer","Chapati (3)","Curd","Salad"], snacks:["Aloo Tikki (2)","Chai"], dinner:["Dal Fry","Steamed Rice","Mushroom Masala","Chapati (3)","Salad","Sweet – Payasam"] },
  Saturday:  { breakfast:["Aloo Paratha (2)","Pickle","Curd","Tea / Coffee"], lunch:["Special Biryani","Raita","Boondi","Papad","Salad"], snacks:["French Fries","Cold Drink"], dinner:["Paneer Tikka Masala","Naan (2)","Dal","Steamed Rice","Salad","Sweet – Ice Cream"] },
  Sunday:    { breakfast:["Puri Bhaji (4)","Pickle","Tea / Coffee","Seasonal Fruit"], lunch:["Special Thali – Dal, Rice, 2 Sabzi, Chapati, Curd, Sweet"], snacks:["Maggi / Noodles","Chai"], dinner:["Butter Chicken / Paneer","Naan (2)","Dal Makhani","Rice","Salad","Sweet – Gulab Jamun"] },
};

const NUTRITION = {
  "Dal Tadka":            { calories:180, protein:"11g", carbs:"28g", fat:"4g",  veg:true },
  "Paneer Butter Masala": { calories:320, protein:"14g", carbs:"18g", fat:"22g", veg:true },
  "Chole":                { calories:270, protein:"15g", carbs:"42g", fat:"6g",  veg:true },
  "Dal Makhani":          { calories:240, protein:"12g", carbs:"32g", fat:"9g",  veg:true },
  "Jeera Rice":           { calories:210, protein:"4g",  carbs:"45g", fat:"2g",  veg:true },
  "Chapati":              { calories:120, protein:"3g",  carbs:"22g", fat:"2g",  veg:true },
};

const TIMINGS = { breakfast:{start:"07:30",end:"09:00"}, lunch:{start:"12:00",end:"14:00"}, snacks:{start:"16:30",end:"17:30"}, dinner:{start:"19:30",end:"21:30"} };

// Pre-serialise weekly menu responses (one JSON string per day — never changes at runtime)
const WEEKLY_JSON = Object.fromEntries(
  Object.entries(WEEKLY_MENU).map(([day, menu]) => [day, JSON.stringify({ success:true, data:{ day, menu, timings:TIMINGS } })])
);

const MANIFEST_JSON = JSON.stringify({
  name:"cafeteria-mcp", description:"Campus Cafeteria MCP Server — menus, nutrition, timings", version:"1.0.0",
  tools:[
    { name:"get_todays_menu",   description:"Get today's full cafeteria menu",                                  parameters:{ type:"object", properties:{} } },
    { name:"get_weekly_menu",   description:"Get the weekly menu, optionally by day and meal",                  parameters:{ type:"object", properties:{ day:{type:"string"}, meal:{type:"string"} } } },
    { name:"get_nutrition_info",description:"Get nutritional info for a dish",                                  parameters:{ type:"object", properties:{ dish_name:{type:"string"} }, required:["dish_name"] } },
    { name:"get_timings",       description:"Get cafeteria meal timings",                                       parameters:{ type:"object", properties:{} } },
  ],
});

// Pre-serialise static responses that never change
const TIMINGS_JSON  = JSON.stringify({ success:true, data:TIMINGS });

app.get("/health", (_, res) => res.json({ status:"ok" }));
app.get("/mcp/manifest", (_, res) => {
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","public, max-age=300");
  res.send(MANIFEST_JSON);
});

app.post("/mcp/execute", (req, res) => {
  const { tool, parameters = {} } = req.body;
  if (!tool) return res.status(400).json({ success:false, error:"Missing tool" });

  res.setHeader("Content-Type","application/json");

  if (tool === "get_todays_menu") {
    const today = DAYS[new Date().getDay()];
    // Pre-serialised per-day response — no JSON.stringify at request time
    return res.send(WEEKLY_JSON[today]);
  }

  if (tool === "get_weekly_menu") {
    const { day, meal } = parameters;
    if (day) {
      const menu = WEEKLY_MENU[day];
      if (!menu) return res.json({ success:false, error:`No menu for: ${day}` });
      // meal filter still dynamic — not worth pre-serialising all combos
      return res.json({ success:true, data: meal ? { day, meal, items:menu[meal]??[] } : { day, menu } });
    }
    return res.json({ success:true, data:WEEKLY_MENU });
  }

  if (tool === "get_nutrition_info") {
    const dish = (parameters.dish_name ?? "").trim();
    if (!dish) return res.json({ success:false, error:"dish_name required" });
    const info = NUTRITION[dish];
    return info
      ? res.json({ success:true, data:{ dish, ...info } })
      : res.json({ success:false, error:`No nutrition data for "${dish}"` });
  }

  if (tool === "get_timings") return res.send(TIMINGS_JSON);

  res.status(400).json({ success:false, error:`Unknown tool: ${tool}` });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🍽️  Cafeteria MCP :${PORT}`));
