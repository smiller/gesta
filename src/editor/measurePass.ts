import type { PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/* a measuring pass run once a frame after the document changes or the
   window resizes. A window wider than the page moves the page's left edge
   and not its size: a pass on the root's size alone missed it (pin:
   margin-note › narrowed to 1000px, typed on) */
export function measurePass(run: (view: EditorView) => void): (view: EditorView) => PluginView {
  return (view) => {
    let frame = 0;
    const schedule = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; run(view); });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(view.dom);
    window.addEventListener("resize", schedule);
    schedule();
    return {
      update: (v, prev) => { if (v.state.doc !== prev.doc) schedule(); },
      destroy: () => {
        observer.disconnect();
        window.removeEventListener("resize", schedule);
        if (frame) cancelAnimationFrame(frame);
      },
    };
  };
}
