// Fill the database with demo tutor data. Run: npm run seed
// WARNING: this drops and recreates every table (including conversations and the message log),
// so it refuses to run when NODE_ENV is "production".
// All people, numbers and bank details below are fictional demo values.

const db = require("./index");

function assertNotProduction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is 'production' and seeding deletes all data.");
  }
}

// Seeds the database that db.open() points at. `now` makes the demo dates reproducible.
function seed({ now = new Date() } = {}) {
  assertNotProduction();
  db.resetSchema();
  const conn = db.open();

  const { date: today } = db.localNow("Asia/Colombo", now);
  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number);
  const lastMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

  // Next date (from tomorrow) that falls on the given ISO weekday.
  const nextWeekday = (isoDow) => {
    let d = db.addDays(today, 1);
    while ((new Date(`${d}T00:00:00Z`).getUTCDay() || 7) !== isoDow) d = db.addDays(d, 1);
    return d;
  };

  // Each row inserts only the columns it gives, so omitted ones keep their schema defaults.
  function insert(table, rows) {
    for (const r of rows) {
      const cols = Object.keys(r);
      conn.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
        .run(...cols.map((c) => r[c]));
    }
    return rows.length;
  }

  const nextSat = nextWeekday(6);
  const nextWed = nextWeekday(3);

  const counts = db.transaction(() => {
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
        "Send a photo of the slip here with the student's name and class.",
    }]);

    n.subjects = insert("subjects", [
      { id: 1, name: "Combined Mathematics", level: "A/L", description: "Pure and applied maths for the A/L physical science stream." },
      { id: 2, name: "Physics", level: "A/L", description: "Full A/L physics syllabus, theory and MCQ/structured practice." },
      { id: 3, name: "Mathematics", level: "O/L", description: "Grade 10 and 11 maths for the O/L exam." },
    ]);

    const HALL = "Apex Institute, 45 Galle Road, Colombo 06";
    n.classes = insert("classes", [
      { id: 1, subject_id: 1, title: "2027 A/L Combined Maths – Theory", class_type: "theory", mode: "physical",
        location: `Hall A, ${HALL}`, day_of_week: 6, start_time: "08:00", duration_minutes: 180, monthly_fee: 3500, capacity: 60 },
      { id: 2, subject_id: 1, title: "2026 A/L Combined Maths – Revision", class_type: "revision", mode: "physical",
        location: `Hall A, ${HALL}`, day_of_week: 7, start_time: "08:00", duration_minutes: 180, monthly_fee: 4000, capacity: 60 },
      { id: 3, subject_id: 1, title: "A/L Combined Maths – Paper Class", class_type: "paper", mode: "online",
        location: "https://zoom.example.com/j/1000000001", day_of_week: 3, start_time: "18:00", duration_minutes: 120,
        monthly_fee: 2500, capacity: 100 },
      { id: 4, subject_id: 2, title: "2027 A/L Physics – Theory", class_type: "theory", mode: "physical",
        location: `Hall B, ${HALL}`, day_of_week: 6, start_time: "13:30", duration_minutes: 180, monthly_fee: 3500, capacity: 50 },
      { id: 5, subject_id: 2, title: "A/L Physics – Paper Class", class_type: "paper", mode: "online",
        location: "https://zoom.example.com/j/1000000002", day_of_week: 4, start_time: "18:30", duration_minutes: 120,
        monthly_fee: 2500, capacity: 100 },
      { id: 6, subject_id: 3, title: "Grade 10 Maths – Theory", class_type: "theory", mode: "physical",
        location: `Room 3, ${HALL}`, day_of_week: 2, start_time: "16:00", duration_minutes: 120, monthly_fee: 2000, capacity: 30 },
      { id: 7, subject_id: 3, title: "Grade 11 O/L Maths – Revision (small group)", class_type: "revision", mode: "online",
        location: "https://zoom.example.com/j/1000000003", day_of_week: 5, start_time: "16:00", duration_minutes: 120,
        monthly_fee: 3000, capacity: 2 }, // deliberately full in the demo
    ].map((c) => ({ ...c, active: 1 })));

    // Next Saturday's theory class is cancelled; next Wednesday's paper class moves to that Friday 19:00.
    n.class_exceptions = insert("class_exceptions", [
      { class_id: 1, date: nextSat, status: "cancelled", note: "Hall unavailable this week. Recording will be shared." },
      { class_id: 3, date: nextWed, status: "rescheduled", new_date: db.addDays(nextWed, 2), new_time: "19:00",
        note: "Moved to Friday 7 pm this week." },
    ]);

    // Contacts: parents, adult students who message for themselves, and a brand-new number.
    n.contacts = insert("contacts", [
      { id: 1, wa_id: "94770000201", name: "Mr. R. Fernando", kind: "parent" },
      { id: 2, wa_id: "94770000202", name: "Mrs. S. Perera", kind: "parent", language: "si" }, // two children
      { id: 3, wa_id: "94770000103", name: "Kavindu Silva", kind: "student" },
      { id: 4, wa_id: "94770000204", name: "Mr. P. Wickramasinghe", kind: "parent",
        bot_paused: 1, paused_reason: "Disputes a rejected slip; tutor is handling it", paused_at: `${today}T04:30:00Z` },
      { id: 5, wa_id: "94770000105", name: "Mohamed Rizwan", kind: "student", language: "ta" },
      { id: 6, wa_id: "94770000206", name: "Mrs. K. Rajapaksha", kind: "parent", language: "si" },
      { id: 7, wa_id: "94770000207", name: "Mr. L. Gunawardena", kind: "parent" },
      { id: 8, wa_id: "94770000108", name: "Shenali de Silva", kind: "student" },
      { id: 9, wa_id: "94770000109" }, // said hello once: no name, no students yet
      { id: 10, wa_id: "94770000210", name: "Ms. A. Herath", kind: "parent" }, // booked a trial only
    ]);

    n.students = insert("students", [
      { id: 1, contact_id: 1, name: "Sahan Fernando", grade: "A/L 2027", school: "Royal College" },
      { id: 2, contact_id: 2, name: "Dilini Perera", grade: "A/L 2027", school: "Visakha Vidyalaya" },
      { id: 3, contact_id: 3, name: "Kavindu Silva", grade: "A/L 2026", school: "Ananda College" },
      { id: 4, contact_id: 4, name: "Tharushi Wickramasinghe", grade: "A/L 2026", school: "Musaeus College" },
      { id: 5, contact_id: 5, name: "Mohamed Rizwan", grade: "A/L 2027", school: "Zahira College" },
      { id: 6, contact_id: 6, name: "Nethmi Rajapaksha", grade: "Grade 10", school: "Devi Balika Vidyalaya" },
      { id: 7, contact_id: 7, name: "Ashen Gunawardena", grade: "Grade 11", school: "Isipathana College" },
      { id: 8, contact_id: 8, name: "Shenali de Silva", grade: "Grade 11", school: "Ladies' College" },
      { id: 9, contact_id: 2, name: "Kasun Perera", grade: "Grade 10", school: "Isipathana College" }, // Dilini's brother
      { id: 10, contact_id: 10, name: "Ishara Herath", grade: "A/L 2027", school: "Sirimavo Balika Vidyalaya" },
    ]);

    n.enrollments = insert("enrollments", [
      { student_id: 1, class_id: 1, status: "active" }, { student_id: 1, class_id: 3, status: "active" },
      { student_id: 1, class_id: 4, status: "active" },
      { student_id: 2, class_id: 1, status: "active" }, { student_id: 2, class_id: 4, status: "active" },
      { student_id: 2, class_id: 5, status: "pending" },
      { student_id: 9, class_id: 6, status: "active" },
      { student_id: 3, class_id: 2, status: "active" }, { student_id: 3, class_id: 3, status: "active" },
      { student_id: 4, class_id: 2, status: "active" }, { student_id: 4, class_id: 5, status: "active" },
      { student_id: 5, class_id: 1, status: "active" }, { student_id: 5, class_id: 4, status: "cancelled" },
      { student_id: 6, class_id: 6, status: "active" },
      { student_id: 7, class_id: 7, status: "active" }, { student_id: 8, class_id: 7, status: "active" },
    ]);

    // Fees. Last month: approved, except Tharushi's paper class (slip rejected).
    // This month: a mix of approved, one slip waiting for review, and due.
    n.payments = db.generateMonthlyFees(lastMonth) + db.generateMonthlyFees(thisMonth);
    const setPay = conn.prepare(`UPDATE payments SET status = ?, slip_media_id = ?, slip_reference = ?, slip_received_at = ?,
                                 reviewed_by = ?, reviewed_at = ?, review_note = ?
                                 WHERE student_id = ? AND class_id = ? AND month = ?`);
    const slip = (month, s, c) => `demo-media-${month}-${s}-${c}`;
    const approve = (month, s, c, day) => setPay.run("approved", slip(month, s, c), `TRX${month.replace("-", "")}${s}${c}`,
      `${month}-${day}T08:00:00Z`, "Mr. Nuwan Jayasekara", `${month}-${day}T12:00:00Z`, null, s, c, month);

    for (const e of conn.prepare("SELECT student_id, class_id FROM enrollments WHERE status = 'active'").all()) {
      if (e.student_id === 4 && e.class_id === 5) continue;
      approve(lastMonth, e.student_id, e.class_id, "05");
    }
    setPay.run("rejected", slip(lastMonth, 4, 5), null, `${lastMonth}-06T08:00:00Z`, "Mr. Nuwan Jayasekara",
      `${lastMonth}-06T15:00:00Z`, "Slip shows LKR 2,000 but the fee is LKR 2,500.", 4, 5, lastMonth);
    for (const [s, c] of [[1, 1], [1, 3], [3, 2], [6, 6]]) approve(thisMonth, s, c, "03");
    // Mrs. Perera sent one slip covering both children's classes; not reviewed yet.
    for (const [s, c] of [[2, 1], [2, 4], [9, 6]]) {
      setPay.run("slip_received", `demo-media-${thisMonth}-perera`, "TRX-PERERA-01", `${today}T03:15:00Z`,
        null, null, null, s, c, thisMonth);
    }

    n.trials = insert("trials", [
      { student_id: 10, class_id: 4, date: nextSat, status: "booked" },             // Physics runs; maths is cancelled
      { student_id: 5, class_id: 3, date: db.addDays(today, -7), status: "attended" },
    ]);

    n.individual_rates = insert("individual_rates", [
      { subject_id: 1, hourly_rate: 3000 }, { subject_id: 2, hourly_rate: 3000 }, { subject_id: 3, hourly_rate: 2000 },
    ]);

    n.availability = insert("availability", [
      { day_of_week: 1, start_time: "16:00", end_time: "20:00" },
      { day_of_week: 2, start_time: "18:30", end_time: "20:30" },
      { day_of_week: 4, start_time: "15:00", end_time: "18:00" },
      { day_of_week: 7, start_time: "14:00", end_time: "18:00" },
    ]);

    n.bookings = insert("bookings", [
      { student_id: 3, subject_id: 1, starts_at: `${nextWeekday(1)} 17:00`, duration_minutes: 60, status: "confirmed",
        topic: "Integration by parts" },
      { student_id: 2, subject_id: 2, starts_at: `${nextWeekday(4)} 16:00`, duration_minutes: 90, status: "requested",
        topic: "Circular motion problems" },
      { student_id: 7, subject_id: 3, starts_at: `${db.addDays(today, -6)} 17:00`, duration_minutes: 60, status: "completed",
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
        answer: "By bank transfer. Send a photo of the slip here with the student's name and class. It's marked as paid once the tutor checks it.",
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
      { question: "Can I try a class first?",
        answer: "Yes. You can book one free trial session of any group class before enrolling.",
        keywords: "trial,try,demo class,free class,first class" },
      { question: "Do you offer individual classes?",
        answer: "Yes, one-to-one sessions are available for Combined Maths and Physics (LKR 3,000/hour) and O/L Maths (LKR 2,000/hour), subject to the tutor's free slots.",
        keywords: "individual,one to one,one-to-one,private,personal,home visit" },
      { question: "Can I get a refund?",
        answer: "Monthly fees aren't refundable once the month has started, but if a class is cancelled by the tutor it's made up or credited to next month.",
        keywords: "refund,money back,cancel fee" },
    ]);

    return n;
  });

  return { counts, today, thisMonth, lastMonth, cancelledDate: nextSat };
}

module.exports = { seed };

if (require.main === module) {
  try {
    const { counts, today, lastMonth, thisMonth } = seed();
    console.log(`Seeded ${db.open().location?.() ?? "database"} (today ${today}; months ${lastMonth} and ${thisMonth}):`);
    for (const [t, c] of Object.entries(counts)) console.log(`  ${t.padEnd(18)} ${c}`);
    db.close();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
