// Tools the AI agent can call. This is its ONLY access to the data.
//
// Tools are created per message for one contact: the contact comes from the handler,
// never from the model, so no tool can read another family's data whatever the model asks.
// Step 2: read-only tools. Write tools (trial, enrol, slips, handoff) come in later steps.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = (date) => DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];

function createTools({ db, contact, now = new Date() }) {
  const tutor = db.getTutor() ?? {};
  const money = (n) => `${tutor.currency ?? "LKR"} ${Number(n).toLocaleString("en-US")}`;
  const students = () => db.listStudents(contact.id);
  const enrolledClassIds = () => new Set(
    students().flatMap((s) => db.listEnrollments(s.id).filter((e) => e.status === "active").map((e) => e.class_id)),
  );
  // Meeting links are only for students enrolled in that class.
  const where = (c, allowed) =>
    c.mode === "online" ? (allowed.has(c.id ?? c.class_id) ? `Online: ${c.location}` : "Online (Zoom link shared after enrolment)") : c.location;

  const tools = {
    get_tutor_info: {
      description: "The tutor's name, background, qualifications, and how to pay fees.",
      parameters: {},
      run: () => ({
        name: tutor.name, bio: tutor.bio, qualifications: tutor.qualifications,
        payment_instructions: tutor.payment_instructions, currency: tutor.currency,
      }),
    },

    list_classes: {
      description: "All group classes: subject, level, type, online/physical, venue, weekly day and time, monthly fee, seats left, and the next two sessions (with any cancellation or reschedule). Use for any question about what classes exist, when, where or how much.",
      parameters: {},
      run: () => {
        const allowed = enrolledClassIds();
        const classes = db.listClasses();
        // Next sessions are included so a cancellation can't be missed when the model
        // only looks at the weekly timetable.
        const upcoming = db.upcomingSessions(classes.map((c) => c.id), { days: 15, now });
        return classes.map((c) => ({
          class_id: c.id, title: c.title, subject: `${c.subject_name} (${c.subject_level})`, type: c.class_type,
          mode: c.mode, where: where(c, allowed), weekly: `${c.day_name} ${c.start_time}`,
          duration_minutes: c.duration_minutes, monthly_fee: money(c.monthly_fee),
          seats_left: c.seats_left ?? "no limit", full: c.seats_left === 0,
          next_sessions: upcoming.filter((s) => s.class_id === c.id).slice(0, 2).map((s) => ({
            date: s.date, day: dayName(s.date), time: s.time, status: s.status,
            ...(s.note ? { note: s.note } : {}),
          })),
        }));
      },
    },

    get_class_schedule: {
      description: "Actual upcoming session dates, including cancellations and reschedules (e.g. holidays). Use for 'is there class this Saturday?', 'when is the next class?'.",
      parameters: {
        class_ids: { type: "array", items: { type: "integer" }, description: "Classes to include (from list_classes). Omit for all classes." },
        days: { type: "integer", minimum: 1, maximum: 31, description: "How many days ahead, default 14." },
      },
      run: ({ class_ids, days = 14 }) => {
        const ids = Array.isArray(class_ids) && class_ids.length ? class_ids.map(Number) : db.listClasses().map((c) => c.id);
        const allowed = enrolledClassIds();
        return db.upcomingSessions(ids, { days: Math.min(Math.max(Number(days) || 14, 1), 31), now }).map((s) => ({
          class_id: s.class_id, title: s.title, date: s.date, day: dayName(s.date), time: s.time, status: s.status,
          ...(s.original_date ? { moved_from: s.original_date } : {}),
          ...(s.note ? { note: s.note } : {}),
          where: where(s, allowed),
        }));
      },
    },

    get_faqs: {
      description: "The tutor's answers to common questions (fees, payment, venue, online classes, missed classes, trials, one-to-one, refunds). Check this before saying you don't know.",
      parameters: {},
      run: () => db.listFaqs().map(({ question, answer }) => ({ question, answer })),
    },

    get_one_to_one_info: {
      description: "Hourly rates for one-to-one (individual) sessions per subject, and the tutor's free weekly slots for them.",
      parameters: {},
      run: () => ({
        rates: db.listSubjects().map((s) => ({ subject: `${s.name} (${s.level})`, hourly_rate: money(db.getIndividualRate(s.id) ?? 0) })),
        free_slots: db.listAvailability().map((a) => ({ day: a.day_name, from: a.start_time, to: a.end_time })),
      }),
    },

    get_my_family: {
      description: "The students linked to THIS WhatsApp contact (their children, or themselves), with each student's class enrolments, trial sessions and one-to-one bookings. Use for 'my classes', 'my son's schedule', etc.",
      parameters: {},
      run: () => {
        const list = students();
        if (!list.length) return { students: [], note: "No students are registered under this contact yet." };
        const allowed = enrolledClassIds();
        return {
          students: list.map((s) => ({
            name: s.name, grade: s.grade, school: s.school,
            classes: db.listEnrollments(s.id).map((e) => ({
              class_id: e.class_id, title: e.title, status: e.status, day: e.day_name, start_time: e.start_time,
              where: where(e, allowed), monthly_fee: money(e.monthly_fee),
            })),
            trials: db.listTrials(s.id).map((t) => ({ class: t.class_title, date: t.date, status: t.status })),
            one_to_one: db.listBookings(s.id, { now }).map((b) => ({
              subject: b.subject_name, starts_at: b.starts_at, minutes: b.duration_minutes, status: b.status, topic: b.topic,
            })),
          })),
        };
      },
    },

    get_my_fees: {
      description: "Monthly fee records for THIS contact's students: amount, month, status (due / slip_received = slip sent, waiting for the tutor to check / approved / rejected / waived), rejection reasons, and the total still owed.",
      parameters: {},
      run: () => {
        const payments = db.listPaymentsForContact(contact.id);
        if (!payments.length) return { payments: [], note: "No fee records for this contact." };
        return {
          total_owed: money(db.amountDueForContact(contact.id)),
          payments: payments.map((p) => ({
            student: p.student_name, class: p.class_title, month: p.month, amount: money(p.amount), status: p.status,
            ...(p.status === "rejected" ? { rejection_reason: p.review_note } : {}),
          })),
        };
      },
    },

    get_my_materials: {
      description: "Notes, papers, recordings and links shared with THIS contact's students' classes.",
      parameters: {},
      run: () => {
        const seen = new Map();
        for (const s of students()) for (const m of db.listMaterials(s.id)) seen.set(m.id, m);
        const enrolledIn = [...new Set(students().flatMap((s) =>
          db.listEnrollments(s.id).filter((e) => e.status === "active").map((e) => e.title)))];
        return {
          materials: [...seen.values()].map((m) => ({ title: m.title, kind: m.kind, url: m.url, class: m.class_title ?? "All students" })),
          active_classes: enrolledIn,
          // Without this the model guesses why something is missing (seen: "the teacher will add it later").
          note: "A class's notes, papers, recordings and links are shared only with students actively enrolled in that class. " +
            "For any other class, materials come with enrolment; say that, and don't promise they will be added or sent.",
        };
      },
    },
  };

  // OpenAI/Groq tool definitions
  const definitions = Object.entries(tools).map(([name, t]) => ({
    type: "function",
    function: {
      name,
      description: t.description,
      parameters: { type: "object", properties: t.parameters, additionalProperties: false },
    },
  }));

  // Run a tool call from the model. Never throws: errors go back to the model as data.
  function run(name, rawArgs) {
    const tool = Object.hasOwn(tools, name) ? tools[name] : null;
    if (!tool) return { error: `Unknown tool "${name}".` };
    let args = {};
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {};
      if (typeof args !== "object" || args === null || Array.isArray(args)) throw new Error("not an object");
    } catch {
      return { error: "Arguments must be a JSON object." };
    }
    try {
      return tool.run(args);
    } catch (err) {
      return { error: `Tool failed: ${err.message}` };
    }
  }

  return { definitions, run, names: Object.keys(tools) };
}

module.exports = { createTools };
