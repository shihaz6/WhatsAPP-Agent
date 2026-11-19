// A small fictional shop for the tests: resets the (in-memory) database and fills it the way an
// owner would from the dashboard. All names, numbers and bank details are made up.

const db = require("../db");

const REGULAR = "94770000001"; // writes in Sinhala
const PAUSED = "94770000002"; // handed over to the owner
const TAMIL = "94770000003"; // writes in Tamil
const NEW_NUMBER = "94779990001"; // has never messaged

function setupShop() {
  db.resetSchema();
  db.saveBusiness({
    name: "Test Spice Shop",
    owner_name: "Test Owner",
    opening_hours: "Mon–Sat, 9:00 AM–7:00 PM",
    location: "1 Test Road, Colombo 03",
    payment_details: "Bank transfer to TEST BANK, account 000-111-222, or cash on delivery",
    delivery_info: "Island-wide in 2–4 working days. Colombo LKR 350, other areas LKR 500.",
  });
  for (const p of [
    { name: "Cinnamon Sticks", price: 1250, stock: 24, category: "Spices", description: "100g pack" },
    { name: "Coconut Oil", price: 1800, stock: 12, category: "Pantry", description: "500ml bottle" },
    { name: "Kithul Treacle", price: 980, stock: 0, category: "Sweeteners", description: "350ml bottle" },
    { name: "Black Tea", price: 1450, stock: null, category: "Tea", description: "200g loose leaf" },
    { name: "Old Hidden Item", price: 500, stock: 3, category: "Spices", active: false },
  ]) db.saveProduct(null, p);
  db.saveFaq(null, { question: "Do you offer cash on delivery?", answer: "Yes, for orders under LKR 10,000." });
  db.saveFaq(null, { question: "Can I return a product?", answer: "Unopened products within 7 days with the receipt." });

  const regular = db.ensureContact(REGULAR);
  db.updateContact(regular.id, { name: "Test Customer", language: "si" });
  const paused = db.ensureContact(PAUSED);
  db.setBotPaused(paused.id, true, "Handed over by the bot:\nWants 30 packs of cinnamon");
  db.updateContact(db.ensureContact(TAMIL).id, { language: "ta" });
}

module.exports = { setupShop, REGULAR, PAUSED, TAMIL, NEW_NUMBER };
