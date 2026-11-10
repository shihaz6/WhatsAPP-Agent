// Fill the database with demo tutor data. Run: npm run seed
// WARNING: this clears every table first (including conversations and the message log).
// All people, numbers and bank details below are fictional demo values.

const db = require("./index");

const conn = db.open();
const { date: today } = db.localNow("Asia/Colombo");
const thisMonth = today.slice(0, 7);
const lastMonth = (() => {
  const [y, m] = thisMonth.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
})();

// Next date (from tomorrow) that falls on the given ISO weekday.
function nextWeekday(isoDow) {
  const d = new Date(`${today}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1); while ((d.getUTCDay() || 7) !== isoDow);
  return d.toISOString().slice(0, 10);
}
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const TABLES = ["messages", "conversations", "faqs", "materials", "availability", "individual_rates",
  "bookings", "payments", "enrollments", "students", "class_exceptions", "classes", "subjects", "tutor"];

function insert(table, rows) {
  const cols = [...new Set(rows.flatMap(Object.keys))]; // union: rows may omit optional columns
  const stmt = conn.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`);
  for (const r of rows) stmt.run(...cols.map((c) => r[c] ?? null));
  return rows.length;
}

const counts = db.transaction(() => {
  for (const t of TABLES) conn.exec(`DELETE FROM ${t}`);
  const n = {};

  n.tutor = insert("tutor", [{
    id: 1,
    name: "Mr. Nuwan Jayasekara",
    phone: "+94 77 000 0001",
    bio: "A/L Combined Maths and Physics tutor with 12 years of experience. Classes in Colombo and online.",
    qualifications: "BSc (Hons) Engineering, University of Moratuwa",
    timezone: "Asia/Colombo",
    currency: "LKR",
    payment_instructions:
      "Pay by bank transfer to DEMO BANK, Account 000-111-222-333, Name: N. Jayasekara, Branch: Wellawatte. " +
      "Send a photo of the slip here with your name and class.",
  }]);

  n.subjects = insert("subjects", [
    { id: 1, name: "Combined Mathematics", level: "A/L", description: "Pure and applied maths for the A/L physical science stream." },
    { id: 2, name: "Physics", level: "A/L", description: "Full A/L physics syllabus, theory and MCQ/structured practice." },
    { id: 3, name: "Mathematics", level: "O/L", description: "Grade 10 and 11 maths for the O/L exam." },
  ]);

  n.classes = insert("classes", [
    { id: 1, subject_id: 1, title: "2027 A/L Combined Maths – Theory", class_type: "theory", mode: "physical",
      location: "Apex Institute, Hall A, 45 Galle Road, Colombo 06", day_of_week: 6, start_time: "08:00",
      duration_minutes: 180, monthly_fee: 3500, capacity: 60, active: 1 },
    { id: 2, subject_id: 1, title: "2026 A/L Combined Maths – Revision", class_type: "revision", mode: "physical",
      location: "Apex Institute, Hall A, 45 Galle Road, Colombo 06", day_of_week: 7, start_time: "08:00",
      duration_minutes: 180, monthly_fee: 4000, capacity: 60, active: 1 },
    { id: 3, subject_id: 1, title: "A/L Combined Maths – Paper Class", class_type: "paper", mode: "online",
      location: "https://zoom.example.com/j/1000000001", day_of_week: 3, start_time: "18:00",
      duration_minutes: 120, monthly_fee: 2500, capacity: 100, active: 1 },
    { id: 4, subject_id: 2, title: "2027 A/L Physics – Theory", class_type: "theory", mode: "physical",
      location: "Apex Institute, Hall B, 45 Galle Road, Colombo 06", day_of_week: 6, start_time: "13:30",
      duration_minutes: 180, monthly_fee: 3500, capacity: 50, active: 1 },
    { id: 5, subject_id: 2, title: "A/L Physics – Paper Class", class_type: "paper", mode: "online",
      location: "https://zoom.example.com/j/1000000002", day_of_week: 4, start_time: "18:30",
      duration_minutes: 120, monthly_fee: 2500, capacity: 100, active: 1 },
    { id: 6, subject_id: 3, title: "Grade 10 Maths – Theory", class_type: "theory", mode: "physical",
      location: "Apex Institute, Room 3, 45 Galle Road, Colombo 06", day_of_week: 2, start_time: "16:00",
      duration_minutes: 120, monthly_fee: 2000, capacity: 30, active: 1 },
    { id: 7, subject_id: 3, title: "Grade 11 O/L Maths – Revision (small group)", class_type: "revision", mode: "online",
      location: "https://zoom.example.com/j/1000000003", day_of_week: 5, start_time: "16:00",
      duration_minutes: 120, monthly_fee: 3000, capacity: 2, active: 1 }, // deliberately full in the demo
  ]);

  // Next Saturday's theory class is cancelled; next Wednesday's paper class moves to that Friday 19:00.
  const nextSat = nextWeekday(6);
  const nextWed = nextWeekday(3);
  n.class_exceptions = insert("class_exceptions", [
    { class_id: 1, date: nextSat, status: "cancelled", note: "Hall unavailable this week. Recording will be shared." },
    { class_id: 3, date: nextWed, status: "rescheduled", new_date: addDays(nextWed, 2), new_time: "19:00",
      note: "Moved to Friday 7 pm this week." },
  ]);

  n.students = insert("students", [
    { id: 1, wa_id: "94770000101", name: "Sahan Fernando", grade: "A/L 2027", school: "Royal College",
      parent_name: "Mr. R. Fernando", parent_phone: "+94 77 000 0201" },
    { id: 2, wa_id: "94770000102", name: "Dilini Perera", grade: "A/L 2027", school: "Visakha Vidyalaya",
      parent_name: "Mrs. S. Perera", parent_phone: "+94 77 000 0202" },
    { id: 3, wa_id: "94770000103", name: "Kavindu Silva", grade: "A/L 2026", school: "Ananda College" },
    { id: 4, wa_id: "94770000104", name: "Tharushi Wickramasinghe", grade: "A/L 2026", school: "Musaeus College",
      parent_name: "Mr. P. Wickramasinghe", parent_phone: "+94 77 000 0204" },
    { id: 5, wa_id: "94770000105", name: "Mohamed Rizwan", grade: "A/L 2027", school: "Zahira College" },
    { id: 6, wa_id: "94770000106", name: "Nethmi Rajapaksha", grade: "Grade 10", school: "Devi Balika Vidyalaya",
      parent_name: "Mrs. K. Rajapaksha", parent_phone: "+94 77 000 0206" },
    { id: 7, wa_id: "94770000107", name: "Ashen Gunawardena", grade: "Grade 11", school: "Isipathana College",
      parent_name: "Mr. L. Gunawardena", parent_phone: "+94 77 000 0207" },
    { id: 8, wa_id: "94770000108", name: "Shenali de Silva", grade: "Grade 11", school: "Ladies' College" },
    // A new contact who has only said hello so far: no name or classes yet.
    { id: 9, wa_id: "94770000109" },
  ]);

  n.enrollments = insert("enrollments", [
    { student_id: 1, class_id: 1, status: "active" }, { student_id: 1, class_id: 3, status: "active" },
    { student_id: 1, class_id: 4, status: "active" },
    { student_id: 2, class_id: 1, status: "active" }, { student_id: 2, class_id: 4, status: "active" },
    { student_id: 2, class_id: 5, status: "pending" },
    { student_id: 3, class_id: 2, status: "active" }, { student_id: 3, class_id: 3, status: "active" },
    { student_id: 4, class_id: 2, status: "active" }, { student_id: 4, class_id: 5, status: "active" },
    { student_id: 5, class_id: 1, status: "active" }, { student_id: 5, class_id: 4, status: "cancelled" },
    { student_id: 6, class_id: 6, status: "active" },
    { student_id: 7, class_id: 7, status: "active" }, { student_id: 8, class_id: 7, status: "active" },
  ]);

  // Last month's fees: mostly paid, one still due. This month's: generated from active enrollments.
  const feeOf = Object.fromEntries(conn.prepare("SELECT id, monthly_fee FROM classes").all().map((c) => [c.id, c.monthly_fee]));
  const active = conn.prepare("SELECT student_id, class_id FROM enrollments WHERE status = 'active'").all();
  const unpaidLastMonth = new Set(["4:5"]);
  n.payments = insert("payments", active.map((e) => {
    const due = unpaidLastMonth.has(`${e.student_id}:${e.class_id}`);
    return { student_id: e.student_id, class_id: e.class_id, month: lastMonth, amount: feeOf[e.class_id],
             status: due ? "due" : "paid", paid_at: due ? null : `${lastMonth}-05T09:00:00Z`,
             reference: due ? null : `SLIP-${lastMonth.replace("-", "")}-${e.student_id}${e.class_id}` };
  }));
  n.payments += db.generateMonthlyFees(thisMonth);
  // A few students have already paid this month.
  for (const [s, c] of [[1, 1], [1, 3], [3, 2], [6, 6]]) {
    conn.prepare(`UPDATE payments SET status = 'paid', paid_at = ?, reference = ?
                  WHERE student_id = ? AND class_id = ? AND month = ?`)
      .run(`${thisMonth}-03T10:00:00Z`, `SLIP-${thisMonth.replace("-", "")}-${s}${c}`, s, c, thisMonth);
  }

  n.individual_rates = insert("individual_rates", [
    { subject_id: 1, hourly_rate: 3000 }, { subject_id: 2, hourly_rate: 3000 }, { subject_id: 3, hourly_rate: 2000 },
  ]);

  n.availability = insert("availability", [
    { day_of_week: 1, start_time: "16:00", end_time: "20:00" },
    { day_of_week: 2, start_time: "18:30", end_time: "20:30" },
    { day_of_week: 4, start_time: "15:00", end_time: "18:00" },
    { day_of_week: 7, start_time: "14:00", end_time: "18:00" },
  ]);

  const nextMon = nextWeekday(1);
  n.bookings = insert("bookings", [
    { student_id: 3, subject_id: 1, starts_at: `${nextMon} 17:00`, duration_minutes: 60, status: "confirmed",
      topic: "Integration by parts" },
    { student_id: 2, subject_id: 2, starts_at: `${nextWeekday(4)} 16:00`, duration_minutes: 90, status: "requested",
      topic: "Circular motion problems" },
    { student_id: 7, subject_id: 3, starts_at: `${addDays(today, -6)} 17:00`, duration_minutes: 60, status: "completed",
      topic: "Geometry theorems" },
  ]);

  n.materials = insert("materials", [
    { class_id: 1, title: "Unit 4 – Differentiation (tutorial)", kind: "notes", url: "https://files.example.com/cm/unit4.pdf" },
    { class_id: 1, title: "Last Saturday's class recording", kind: "recording", url: "https://video.example.com/cm-theory-latest" },
    { class_id: 3, title: "Paper 07 – Combined Maths model paper", kind: "paper", url: "https://files.example.com/cm/paper07.pdf" },
    { class_id: 4, title: "Unit 2 – Mechanics notes", kind: "notes", url: "https://files.example.com/phy/unit2.pdf" },
    { class_id: 5, title: "Physics MCQ set 12", kind: "paper", url: "https://files.example.com/phy/mcq12.pdf" },
    { class_id: 6, title: "Grade 10 – Algebra worksheet", kind: "notes", url: "https://files.example.com/ol/algebra.pdf" },
    { class_id: null, title: "2027 class timetable", kind: "link", url: "https://files.example.com/timetable-2027.pdf" },
  ]);

  n.faqs = insert("faqs", [
    { question: "How much are the class fees?",
      answer: "Theory classes are LKR 3,500 a month, revision LKR 4,000, paper classes LKR 2,500, and O/L classes LKR 2,000–3,000. Fees are paid monthly.",
      keywords: "fee,fees,price,cost,how much,payment amount" },
    { question: "How do I pay?",
      answer: "By bank transfer. Send a photo of the slip here with your name and class, and it'll be marked as paid.",
      keywords: "pay,payment,bank,transfer,slip,deposit" },
    { question: "Where are the physical classes held?",
      answer: "At Apex Institute, 45 Galle Road, Colombo 06 (next to the Wellawatte bus stop).",
      keywords: "where,location,address,hall,institute,venue" },
    { question: "How do I join online classes?",
      answer: "You'll get the Zoom link here once your enrollment is confirmed. Join 5 minutes early with your name as shown on your registration.",
      keywords: "online,zoom,link,join" },
    { question: "I missed a class. What can I do?",
      answer: "Recordings of theory classes are shared within 24 hours for students whose fees are paid for the month.",
      keywords: "missed,miss,absent,recording,catch up" },
    { question: "Can I join in the middle of the year?",
      answer: "Yes. New students can join any month; the tutor will share notes for the units already covered.",
      keywords: "join late,middle,new student,start now,register" },
    { question: "Do you offer individual classes?",
      answer: "Yes, one-to-one sessions are available for Combined Maths and Physics (LKR 3,000/hour) and O/L Maths (LKR 2,000/hour), subject to the tutor's free slots.",
      keywords: "individual,one to one,one-to-one,private,personal,home visit" },
    { question: "Can I get a refund?",
      answer: "Monthly fees aren't refundable once the month has started, but if a class is cancelled by the tutor it's made up or credited to next month.",
      keywords: "refund,money back,cancel fee" },
  ]);

  return n;
});

console.log(`Seeded ${conn.location?.() ?? "database"} (today ${today}; months ${lastMonth} and ${thisMonth}):`);
for (const [t, c] of Object.entries(counts)) console.log(`  ${t.padEnd(18)} ${c}`);
db.close();
