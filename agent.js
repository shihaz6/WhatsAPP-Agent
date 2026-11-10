// Agent logic: decide how to reply to an incoming WhatsApp message.
// Returns the reply text, or null to send nothing.
// For now this is a simple echo to prove the reply loop works end to end.

function getReply(msg) {
  if (msg.type === "text") {
    const text = msg.text?.body?.trim();
    return text ? `You said: ${text}` : null;
  }
  return "Sorry, I can only read text messages for now.";
}

module.exports = { getReply };
