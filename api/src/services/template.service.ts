/** Handlebars template loader/renderer with a shared layout + currency/date helpers. */
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const cache = new Map<string, HandlebarsTemplateDelegate>();

Handlebars.registerHelper('money', (amount: unknown, currency: unknown) => `${currency ?? ''} ${Number(amount ?? 0).toFixed(2)}`);
Handlebars.registerHelper('date', (d: unknown) => (d ? new Date(d as string).toLocaleDateString('en-GB') : ''));

function load(name: string): HandlebarsTemplateDelegate {
  if (cache.has(name)) return cache.get(name)!;
  const file = path.join(TEMPLATE_DIR, `${name}.hbs`);
  const source = fs.readFileSync(file, 'utf-8');
  const compiled = Handlebars.compile(source);
  cache.set(name, compiled);
  return compiled;
}

/** Render a named template wrapped in the shared email layout (unless rendering the layout/invoice itself). */
export function renderTemplate(name: string, data: Record<string, unknown>): string {
  const body = load(name)(data);
  if (name === 'invoice' || name === 'courier-receipt' || name === 'layout') return body;
  try {
    return load('layout')({ ...data, body: new Handlebars.SafeString(body) });
  } catch {
    return body; // layout optional
  }
}
