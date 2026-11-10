// Main menu. Step 1 placeholder: plain text, so the routing can be tested end to end.
// Step 2 replaces this with the language buttons and a list message.

const text = (body) => ({ type: "text", body });

function show({ db, contact }) {
  const tutor = db.getTutor();
  const hello = contact.name ? `Hi ${contact.name}!` : "Hi!";
  return {
    state: "main_menu",
    context: {},
    replies: [text(
      `${hello} 👋 Welcome to ${tutor?.name ?? "the tutor"}'s class assistant.\n\n` +
      "The full menu is on its way. Type *menu* any time to come back here.",
    )],
  };
}

function handle() {
  return {
    state: "main_menu",
    context: {},
    replies: [text("Sorry, I didn't catch that. Type *menu* to see the options.")],
  };
}

module.exports = { show, handle };
