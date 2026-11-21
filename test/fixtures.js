// A small fictional educational institute for the tests: resets the (in-memory) database and fills
// it the way an owner would from the dashboard. All names, numbers and bank details are made up.
// Courses are stored in the products table: price = fee, stock = seats left, category = subject / grade.

const db = require("../db");

const REGULAR = "94770000001"; // writes in Sinhala
const PAUSED = "94770000002"; // handed over to the owner
const TAMIL = "94770000003"; // writes in Tamil
const NEW_NUMBER = "94779990001"; // has never messaged

function setupInstitute() {
  db.resetSchema();
  db.saveBusiness({
    name: "Test Academy",
    owner_name: "Test Owner",
    opening_hours: "Mon–Sat, 8:00 AM–6:00 PM",
    office_opens: "08:00",
    office_closes: "18:00",
    location: "1 Test Road, Colombo 03",
    payment_details: "Bank transfer to TEST BANK, account 000-111-222, or pay at the office",
    delivery_info: "Physical classes in Colombo and online on Zoom. Admission fee LKR 1,000, paid once.",
  });
  for (const c of [
    { name: "Grade 11 Maths", price: 3000, stock: 24, category: "O/L", description: "Saturday 8:00 AM, Sinhala medium" },
    { name: "Spoken English", price: 4500, stock: 12, category: "Languages", description: "Online, 3 months" },
    { name: "A/L Physics Theory", price: 3500, stock: 0, category: "A/L Science", description: "Sunday 2:00 PM" },
    { name: "IELTS Preparation", price: 25000, stock: null, category: "IELTS", description: "8 weeks, weekday evenings" },
    { name: "Old Hidden Item", price: 500, stock: 3, category: "O/L", active: false },
  ]) db.saveProduct(null, c);
  db.saveFaq(null, { question: "Is there an admission fee?", answer: "Yes, LKR 1,000 once, when you join." });
  db.saveFaq(null, { question: "Are classes recorded?", answer: "Online classes are recorded and shared for 7 days." });

  const regular = db.ensureContact(REGULAR);
  db.updateContact(regular.id, { name: "Test Parent", language: "si" });
  const paused = db.ensureContact(PAUSED);
  db.setBotPaused(paused.id, true, "Handed over by the bot:\nWants to enrol in Grade 11 Maths");
  db.updateContact(db.ensureContact(TAMIL).id, { language: "ta" });
}

module.exports = { setupInstitute, REGULAR, PAUSED, TAMIL, NEW_NUMBER };
