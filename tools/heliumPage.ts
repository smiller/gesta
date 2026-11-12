import type { Page, BrowserContext } from "playwright-core";

export type { Page, BrowserContext };

/* the old app's test seam, the members its adapter calls */
interface OldSeam {
  state(): { date: string; tag: string | null };
  entryKey(date: string, tag: string | null): string;
  entryHtml(key: string): string | undefined;
  setEntry(key: string, html: string): Promise<void>;
  removeEntry(key: string): Promise<void>;
  mdToHtml(md: string): string;
  htmlStringToMd(html: string): string;
  reindex(): void;
}

/* what the drivers install in the page, and the page's own seams */
declare global {
  interface Window {
    __lastEdit: number;
    __writes: number;
    __typed: number;
    __walks: number;
    __pickers: number;
    __pickerAbort: () => void;
    __selSeen: boolean;
    __persistAsked: boolean;
    __clip: [Clipboard["write"], Clipboard["writeText"], Document["execCommand"]];
    __idb: [IDBObjectStore["put"], IDBObjectStore["add"]];
    gesta: OldSeam;
    showDirectoryPicker: (opts?: { mode?: "read" | "readwrite" }) => Promise<unknown>;
  }
}
