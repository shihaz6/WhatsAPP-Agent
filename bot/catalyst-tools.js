// Tools for the AlchemyX / Catalyst sales assistant. Same interface as ./tools.js
// ({ definitions, run, names }), so the agent loop doesn't care which set it gets.
//
// Created per message for one contact: the contact comes from the handler, never from the
// model, so a handoff can only ever be filed for the person in this chat.

function createTools({ db, contact }) {
  const tools = {
    hand_off_to_team: {
      description:
        "Pass this chat to the AlchemyX team (a human). Use it when the knowledge base says to escalate: " +
        "custom price or discount, contract or invoice, a complaint, something broken, an integration or " +
        "question the knowledge base doesn't cover, a data-removal request, or they ask for a human. " +
        "Collect their name and business details first when you can. After this the bot goes quiet in " +
        "this chat until the team takes over, so tell the customer the team will message them.",
      parameters: {
        name: { type: "string", description: "The customer's name, if they gave it." },
        summary: {
          type: "string",
          description:
            "The HANDOFF summary from section 11 of the knowledge base, one field per line: Name, " +
            "Business / type, Language, Messages per day (approx), Main need, Number situation, " +
            "Question / reason for handoff, Suggested next step. Write \"unknown\" for anything not asked yet.",
        },
      },
      run({ name, summary }) {
        if (typeof summary !== "string" || !summary.trim()) return { error: "summary is required." };
        if (typeof name === "string" && name.trim() && !contact.name) db.updateContact(contact.id, { name: name.trim() });
        const text = `HANDOFF\nPhone: ${contact.wa_id}\n${summary.trim()}`.slice(0, 2000);
        db.setBotPaused(contact.id, true, text);
        return { ok: true, note: "The team has the summary. The bot is now paused for this chat." };
      },
    },
  };

  const definitions = Object.entries(tools).map(([name, t]) => ({
    type: "function",
    function: {
      name,
      description: t.description,
      parameters: { type: "object", properties: t.parameters, additionalProperties: false },
    },
  }));

  // Never throws: errors go back to the model as data.
  function run(name, rawArgs) {
    const tool = Object.hasOwn(tools, name) ? tools[name] : null;
    if (!tool) return { error: `Unknown tool "${name}".` };
    let args;
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {};
      if (typeof args !== "object" || args === null || Array.isArray(args)) throw new Error("not an object");
    } catch {
      return { error: "Arguments must be a JSON object." };
    }
    try {
      return tool.run(args);
    } catch (err) {
      return { error: err.message };
    }
  }

  return { definitions, run, names: Object.keys(tools) };
}

module.exports = { createTools };
