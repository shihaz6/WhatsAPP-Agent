// Tools the AI agent can call. This is its ONLY access to the data.
//
// Tools are created per message for one contact: the contact comes from the handler, never from
// the model, so a handover can only ever be filed for the person in this chat.

function createTools({ db, contact }) {
  const business = db.getBusiness() ?? {};
  const money = (n) => `${business.currency || "LKR"} ${Number(n).toLocaleString("en-US")}`;
  const stockText = (p) => (p.stock == null ? "in stock" : p.stock === 0 ? "out of stock" : `${p.stock} in stock`);
  const product = (p) => ({
    name: p.name, price: money(p.price), availability: stockText(p),
    ...(p.category ? { category: p.category } : {}),
    ...(p.description ? { details: p.description } : {}),
  });

  const tools = {
    hand_off_to_owner: {
      description:
        "Pass this chat to the shop owner (a human). Use it whenever one of the owner's handover rules applies " +
        "(they are in your instructions), when they want to place or confirm an order, complain, send a photo or " +
        "document you can't act on, or ask something the other tools can't answer. Collect the useful details " +
        "first (what they want, product, quantity, delivery area). The bot then goes quiet in this chat and the " +
        "owner replies here.",
      parameters: {
        summary: {
          type: "string",
          description: "For the owner, one line each: what they want, products and quantities, delivery area, " +
            "and anything else useful. Plain English.",
        },
      },
      run: ({ summary }) => {
        if (typeof summary !== "string" || !summary.trim()) return { error: "summary is required." };
        db.setBotPaused(contact.id, true, `Handed over by the bot:\n${summary.trim()}`.slice(0, 2000));
        return { ok: true, note: "The owner has the summary and will reply in this chat. The bot is now paused here." };
      },
    },

    get_business_info: {
      description: "The business's name, opening hours, location, how to pay, and delivery information (areas, times, charges).",
      parameters: {},
      run: () => {
        const info = {
          name: business.name || null,
          opening_hours: business.opening_hours,
          location: business.location,
          payment_details: business.payment_details,
          delivery_info: business.delivery_info,
        };
        const missing = Object.entries(info).filter(([, v]) => !v).map(([k]) => k.replace("_", " "));
        return missing.length
          ? { ...info, note: `Not set by the owner: ${missing.join(", ")}. Don't guess these; offer to pass the question to the owner.` }
          : info;
      },
    },

    search_products: {
      description:
        "Find products the shop sells, with price, availability and details. Search by product name, type or " +
        "category (e.g. \"cinnamon\", \"tea\", \"oil 500ml\"). Leave query empty to list everything. Use it for any " +
        "question about what's sold, prices or stock.",
      parameters: {
        query: { type: "string", description: "Words to look for. Empty = all products." },
      },
      run: ({ query = "" }) => {
        const found = db.searchProducts(typeof query === "string" ? query : "", { limit: 25 });
        if (found.length) return { products: found.map(product) };
        return {
          products: [],
          note: db.listProducts({ activeOnly: true }).length
            ? "No product matches that. Say the shop doesn't list it; offer to show what's available or pass the question to the owner."
            : "The shop hasn't listed any products yet. Don't name products or prices; offer to pass the question to the owner.",
        };
      },
    },

    get_faqs: {
      description: "The owner's answers to common questions (returns, cash on delivery, warranties, bulk prices, ...). Check this before saying you don't know.",
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
