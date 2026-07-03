// Clamp `v` into the inclusive [lo, hi] range.
export const clampNum = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

// Wrap every case-insensitive occurrence of `query` in `<mark class="preview_find_hit">` within the
// element's text nodes. Returns the number of matches. Assumes the element holds clean HTML (no
// prior marks) — callers reset innerHTML before each run.
export const highlightMatches = (root: HTMLElement, query: string): number => {
  const needle = query.toLowerCase();
  if (!needle) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    textNodes.push(n as Text);

  let count = 0;
  for (const node of textNodes) {
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    if (!lower.includes(needle)) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (
      let idx = lower.indexOf(needle);
      idx !== -1;
      idx = lower.indexOf(needle, pos)
    ) {
      if (idx > pos)
        frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement("mark");
      mark.className = "preview_find_hit";
      mark.textContent = text.slice(idx, idx + needle.length);
      frag.appendChild(mark);
      count += 1;
      pos = idx + needle.length;
    }
    if (pos < text.length)
      frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode?.replaceChild(frag, node);
  }
  return count;
};
