// Subject "Re: Foo" / "Fwd: Foo" → "foo" for threading.
function threadKeyFor(subject) {
  if (!subject) return '(no subject)';
  return subject
    .toLowerCase()
    .replace(/^\s*(re|fwd|fw)\s*:\s*/i, '')
    .replace(/^\s*(re|fwd|fw)\s*:\s*/i, '')
    .trim() || '(no subject)';
}

module.exports = { threadKeyFor };
