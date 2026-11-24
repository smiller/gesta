import type { Kind } from "./model/alertText.ts";

export type Fading = "info" | "success";
/* what each kind of alert holds while it is live */
export type LiveAlerts = Partial<Record<Kind, string>> & { latest?: Fading };
export interface SaidLog { n: number; recent: { n: number; kind: Kind; text: string }[] }
/* the search row: open, the query its rows answer (null until a scan,
   the load or the index answers it), how many rows, the explanatory line */
export interface SearchShown { open: boolean; answered: string | null; rows: number; empty: string }
/* the page's state published on the root, each value under its own
   attribute, for a reader outside the app to read without waiting on
   what is drawn */
export interface Published {
  entry: string | null;
  savesPending: number;
  alerts: LiveAlerts;
  saidLog: SaidLog;
  search: SearchShown | null;
  menuSel: string | null;
  menuArea: number;
  /* how many entries the store holds, or why it could not be read */
  store: string | null;
  /* the launch's stages so far, each ended by ";" */
  probe: string;
}
export type PublishedName = keyof Published;
/* a value as published, or its none while it is not: run in a reader's
   page as it is, so it names nothing outside itself (pin: published.test ›
   a value not yet published) */
export function decoded<K extends PublishedName>(name: K, raw: string | undefined): Published[K] {
  const json = (s: string): unknown => JSON.parse(s), text = (s: string): string => s;
  const [none, read] = ({
    entry: [null, text], savesPending: [0, Number], alerts: [{}, json], saidLog: [{ n: 0, recent: [] }, json], search: [null, json],
    menuSel: [null, text], menuArea: [0, Number], store: [null, text], probe: ["", text],
  } as Record<PublishedName, [unknown, (s: string) => unknown]>)[name];
  return (raw === undefined ? none : read(raw)) as Published[K];
}
const encoded = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));
/* null withdraws the value */
export function publish<K extends PublishedName>(name: K, value: Published[K] | null): void {
  const d = document.documentElement.dataset;
  if (value === null) delete d[name];
  else d[name] = encoded(value);
}
export const current = <K extends PublishedName>(name: K): Published[K] => decoded(name, document.documentElement.dataset[name]);
