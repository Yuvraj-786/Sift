const PRIORITY_HEADINGS = ["experience", "skills", "projects", "education"];

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function capText(value, maxLength) {
  const normalized = normalizeText(value);
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength).trim();
}

function truncateResume(value, maxLength = 24000) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;

  const headingPattern = /^\s*(experience|work experience|employment|skills|technical skills|projects|education)\s*:??\s*$/gim;
  const matches = [...normalized.matchAll(headingPattern)];
  const introEnd = matches[0] ? matches[0].index : Math.min(normalized.length, 6000);
  const sections = [{ heading: "summary", content: normalized.slice(0, introEnd).trim() }];

  matches.forEach((match, index) => {
    const sectionEnd = matches[index + 1]?.index || normalized.length;
    sections.push({ heading: match[1].toLowerCase(), content: normalized.slice(match.index, sectionEnd).trim() });
  });

  const selected = [];
  const seen = new Set();
  const orderedSections = [
    sections[0],
    ...PRIORITY_HEADINGS.flatMap((heading) => sections.filter((section) => section.heading.includes(heading))),
  ];

  for (const section of orderedSections) {
    if (!section || seen.has(section.content)) continue;
    const remaining = maxLength - selected.join("\n\n").length;
    if (remaining <= 0) break;
    selected.push(section.content.slice(0, remaining));
    seen.add(section.content);
  }
  return selected.join("\n\n").slice(0, maxLength).trim();
}

module.exports = { capText, normalizeText, truncateResume };
