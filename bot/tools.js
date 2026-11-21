// Tools the AI agent can call. This is its ONLY access to the data.
//
// Tools are created per message for one contact: the contact comes from the handler, never from
// the model, so a handover can only ever be filed for the person in this chat.

function createTools({ db, contact }) {
  const business = db.getBusiness() ?? {};
  const money = (n) => `${business.currency || "LKR"} ${Number(n).toLocaleString("en-US")}`;
  // Courses live in the products table: price = fee, stock = seats left (null = not limited),
  // category = subject / grade, description = schedule, teacher, medium, duration.
  const seatsText = (c) => (c.stock == null ? "open" : c.stock === 0 ? "full (no seats left)" : `${c.stock} seats left`);
  const course = (c) => ({
    name: c.name, fee: money(c.price), seats: seatsText(c),
    ...(c.category ? { subject_or_grade: c.category } : {}),
    ...(c.description ? { details: c.description } : {}),
  });

  const tools = {
    hand_off_to_owner: {
      description:
        "Pass this chat to the institute's office (a human). Use it whenever one of the owner's handover rules " +
        "applies (they are in your instructions), when they want to enrol, register, book a trial class or pay " +
        "fees, complain, ask about their own child's marks, attendance or progress, send a photo or document " +
        "(e.g. a payment slip) you can't act on, or ask something about this institute the other tools can't " +
        "answer. Collect the useful details first (student's name, grade or level, course, batch or class mode). " +
        "The bot then goes quiet in this chat and the office replies here. NOT for questions about other " +
        "students or other people, homework or subject questions, or topics unrelated to the institute: answer " +
        "those yourself (you can't share details about other students; you only help with the institute).",
      parameters: {
        summary: {
          type: "string",
          description: "For the office, one line each: what they want, student's name, grade or level, course, " +
            "batch or class mode, and anything else useful. Plain English.",
        },
      },
      run: ({ summary }) => {
        if (typeof summary !== "string" || !summary.trim()) return { error: "summary is required." };
        db.setBotPaused(contact.id, true, `Handed over by the bot:\n${summary.trim()}`.slice(0, 2000));
        return { ok: true, note: "The owner has the summary and will reply in this chat. The bot is now paused here." };
      },
    },

    get_business_info: {
      description: "The institute's name, office hours, location, how to pay fees, and class and enrolment " +
        "information (physical or online classes, intakes, how to register).",
      parameters: {},
      run: () => {
        const info = {
          name: business.name || null,
          office_hours: business.opening_hours,
          opens_at: business.office_opens,
          closes_at: business.office_closes,
          location: business.location,
          paying_fees: business.payment_details,
          classes_and_enrolment: business.delivery_info,
        };
        const missing = Object.entries(info).filter(([, v]) => !v).map(([k]) => k.replaceAll("_", " "));
        return missing.length
          ? { ...info, note: `Not set by the owner: ${missing.join(", ")}. Don't guess these; offer to pass the question to the owner.` }
          : info;
      },
    },

    search_courses: {
      description:
        "Find the courses and classes the institute offers, with fee, seats left, subject or grade, and details " +
        "(schedule, teacher, medium, duration). Search by course name, subject, grade or teacher (e.g. \"maths\", " +
        "\"grade 10\", \"A/L\", \"IELTS\"). Leave query empty to list everything. Use it for any question about " +
        "what's taught, fees, class times or seats.",
      parameters: {
        query: { type: "string", description: "Words to look for. Empty = all courses." },
      },
      run: ({ query = "" }) => {
        const found = db.searchProducts(typeof query === "string" ? query : "", { limit: 25 });
        if (found.length) return { courses: found.map(course) };
        return {
          courses: [],
          note: db.listProducts({ activeOnly: true }).length
            ? "No course matches that. Say the institute doesn't list it; offer to show what's offered or pass the question to the office."
            : "The institute hasn't listed any courses yet. Don't name courses or fees; offer to pass the question to the office.",
        };
      },
    },

    get_faqs: {
      description: "The owner's answers to common questions (admission fees, refunds, class recordings, exams, sibling discounts, ...). Check this before saying you don't know.",
      parameters: {},
      run: () => {
        const faqs = db.listFaqs().map(({ question, answer }) => ({ question, answer }));
        return faqs.length ? faqs : { faqs: [], note: "The owner hasn't added any FAQs." };
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
