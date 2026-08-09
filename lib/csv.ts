import "server-only";

/** Escapes a value for a CSV cell, including defense against CSV/formula
 * injection (CWE-1236): if a cell starts with =, +, -, or @, Excel/Sheets
 * treats it as a formula when the file is opened, which can range from a
 * data-exfiltrating HYPERLINK() to (on older Excel with DDE enabled)
 * command execution. Every export here includes at least one column that's
 * free text set by a lower-trust actor than the admin who opens the file —
 * vehicle name/model and lister display name (listings export), a
 * self-registered user's full name (users export), and action metadata
 * that can echo back user-supplied strings (activity log export) — so
 * this isn't a defense-in-depth nicety, it's the actual boundary.
 * Prefixing a single quote is the standard mitigation: it forces
 * spreadsheet apps to treat the cell as text instead of evaluating it. */
export function toCsvField(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
