// Picks the flow for an incoming message from the contact's conversation state.
//
// A flow handler takes ctx = { db, contact, conversation, incoming } and returns
//   { state, context?, replies: [{ type: 'text', body }] }
// The returned state/context are saved and decide where the next message goes.

const menu = require("./flows/menu");

// "menu" always goes back to the main menu, whatever state the contact is in.
const isMenuCommand = (text) => /^\s*menu\s*[.!]?\s*$/i.test(text ?? "");

// state name -> handler for the next message in that state
const STATES = {
  idle: menu.show,         // new contact, or nothing in progress
  main_menu: menu.handle,  // the menu is showing; waiting for a choice
};

function route(ctx) {
  if (isMenuCommand(ctx.incoming.text)) return menu.show(ctx);
  const handler = STATES[ctx.conversation.state];
  // Unknown state (e.g. left over from an older version): start again from the menu.
  return handler ? handler(ctx) : menu.show(ctx);
}

module.exports = { route, isMenuCommand, STATES };
