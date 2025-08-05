// © 2025 AMPIQ All rights reserved.
const crypto = require('crypto');

function splitSentences(text) {
  return (
    text
      .replace(/\n+/g, ' ')
      .match(/[^.?!]+[.?!]*/g) || [text]
  );
}

module.exports = {
  async summarize(text) {
    const sents = splitSentences(text);
    const top   = sents.sort((a, b) => b.length - a.length).slice(0, 3);
    return top.join(' ');
  },

  async embed(text) {
    const hash = crypto.createHash('sha256').update(text).digest();
    return Array.from(hash).slice(0, 16).map(b => b / 255);
  }
};