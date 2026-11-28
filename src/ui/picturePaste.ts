import type { ImageStore } from "../store/store.ts";
import { pictureIn, type EntryFile } from "../store/names.ts";
import { nextPictureName } from "../store/pictures.ts";
import { errText } from "../store/files.ts";
import type { Raise } from "../model/alertText.ts";

interface Aim { ekey: string; md: boolean }
export interface PicturePasteDeps {
  /* the entry open and whether in markdown mode */
  where(): Aim;
  locked(): boolean;
  decode(file: File): Promise<Uint8Array>;
  place(): { at: EntryFile; md: string };
  images: Pick<ImageStore, "keys" | "set">;
  insert(name: string): void;
  raise: Raise;
}

const same = (a: Aim, b: Aim): boolean => a.ekey === b.ekey && a.md === b.md;

/* a write that fails is not a picture that could not be read, and only
   a full store is said to be full; the error copies the caught error
   (pin: alerts and surfaces › a picture whose write fails) */
function notSaved(d: PicturePasteDeps, err: unknown): void {
  console.error("picture not saved", err);
  d.raise((err as { name?: string })?.name === "QuotaExceededError" ? "pictureNotSavedFull" : "pictureNotSaved", { copy: errText(err) });
}
function unreadable(d: PicturePasteDeps, err: unknown): void {
  console.error("picture not pasted", err);
  d.raise("pictureUnreadable");
}
/* WHERE A PICTURE WAS AIMED is checked when its bytes are ready and again
   once they are stored: a reader can navigate, or the entry be locked,
   meanwhile. Every way it
   cannot land sticks: the gesture is spent, and a picture stored is left
   unused (pin: picture › a picture pasted, then another entry at once)
   (pin: picturePaste.test › another entry opened while the picture is
   stored) */
const aimed = (d: PicturePasteDeps, aim: Aim): boolean => same(aim, d.where()) && !d.locked();
function put(d: PicturePasteDeps, aim: Aim, name: string): void {
  if (aimed(d, aim)) d.insert(name); else d.raise("pictureNowhere");
}
function land(d: PicturePasteDeps, bytes: Uint8Array, aim: Aim): Promise<void> | void {
  if (!aimed(d, aim)) { d.raise("pictureNowhere"); return; }
  const { at, md } = d.place();
  return d.images.keys()
    .then((stored) => { const name = nextPictureName(at, md, stored); return d.images.set(pictureIn(at, name), bytes).then(() => name); })
    .then((name) => { put(d, aim, name); }, (err: unknown) => { notSaved(d, err); });
}

export function picturePaste(d: PicturePasteDeps): (file: File) => void {
  /* ONE AT A TIME, until the picture is stored: two pastes listing the
     store before either is written take one name, and the second write
     puts its picture in place of the first (pin: picturePaste.test › a
     picture pasted while the last is still being stored) */
  let busy = false;
  return (file) => {
    if (d.locked()) return;
    if (busy) { d.raise("pictureOneAtATime"); return; }
    const aim = d.where();
    busy = true;
    d.decode(file).then((bytes) => land(d, bytes, aim), (err: unknown) => { unreadable(d, err); })
      .catch((err: unknown) => { notSaved(d, err); })
      .finally(() => { busy = false; });
  };
}
