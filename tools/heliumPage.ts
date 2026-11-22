import type { Page, BrowserContext } from "playwright-core";

export type { Page, BrowserContext };

/* what the drivers install in the page */
declare global {
  interface Window {
    __lastEdit: number;
    __corner: () => string | undefined;
    __flashes: () => string;
    __writes: number;
    __typed: number;
    __walks: number;
    __pickers: number;
    __pickerAbort: () => void;
    __releaseTyped: () => void;
    __selSeen: boolean;
    __selFrom: unknown[];
    __selUnmoved: () => boolean;
    __selCalls: { m: string; t: number; collapsed: boolean; by: string }[];
    __persistAsked: boolean;
    __clip: [Clipboard["write"], Clipboard["writeText"], Document["execCommand"]];
    __idb: [IDBObjectStore["put"], IDBObjectStore["add"]];
    showDirectoryPicker: (opts?: { mode?: "read" | "readwrite" }) => Promise<unknown>;
  }
}
