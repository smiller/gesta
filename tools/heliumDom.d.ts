/* the page as the Helium steps read it: a query answers with an element
   carrying what the steps read off an input, a select, a details or an
   image, a missing one failing the step that played it */
interface HeliumElement extends HTMLElement {
  value: string;
  checked: boolean;
  open: boolean;
  label: string;
  reversed: boolean;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  options: HTMLOptionsCollection;
  selectedOptions: HTMLCollectionOf<HTMLOptionElement>;
  selectedIndex: number;
  selectionStart: number;
  selectionEnd: number;
  setSelectionRange(start: number, end: number, direction?: "forward" | "backward" | "none"): void;
}
interface ParentNode {
  querySelector(selectors: string): HeliumElement;
  querySelectorAll(selectors: string): NodeListOf<HeliumElement>;
}
interface Document {
  getElementById(elementId: string): HeliumElement;
}
interface Element {
  closest(selectors: string): HeliumElement;
}
/* a text node a walk or a selection hands over */
interface Node {
  data?: string;
  length?: number;
  closest?(selectors: string): HeliumElement;
}
