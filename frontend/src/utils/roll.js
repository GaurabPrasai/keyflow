/**
 * RollingNumber. Each digit is a slot holding a 0-9 strip; only `transform`
 * on that strip ever changes (260ms ease-out-quint), so a stats update never
 * causes a layout. Values are written straight to DOM nodes — no React state
 * per tick.
 */
const DIGITS = "0123456789";

function signature(text) {
  let out = "";
  for (const char of text) out += DIGITS.includes(char) ? "d" : char;
  return out;
}

function build(el, text) {
  const fragment = document.createDocumentFragment();
  for (const char of text) {
    if (DIGITS.includes(char)) {
      const slot = document.createElement("span");
      slot.className = "roll-slot";
      const strip = document.createElement("span");
      strip.className = "roll-strip";
      // Set before insertion: a fresh node paints at its final value.
      strip.style.transform = `translate3d(0, ${-Number(char)}em, 0)`;
      for (let digit = 0; digit < 10; digit += 1) {
        const glyph = document.createElement("span");
        glyph.textContent = String(digit);
        strip.appendChild(glyph);
      }
      slot.appendChild(strip);
      fragment.appendChild(slot);
    } else {
      const glyph = document.createElement("span");
      glyph.className = "roll-static";
      glyph.textContent = char;
      fragment.appendChild(glyph);
    }
  }
  el.replaceChildren(fragment);
  el.dataset.signature = signature(text);
}

export function setRolling(el, text) {
  if (!el) return;
  const value = String(text);
  if (el.dataset.value === value) return;
  el.dataset.value = value;
  if (el.dataset.signature !== signature(value)) {
    build(el, value);
    return;
  }
  const children = el.children;
  let index = 0;
  for (const char of value) {
    if (!DIGITS.includes(char)) {
      index += 1;
      continue;
    }
    const strip = children[index]?.firstElementChild;
    if (strip) strip.style.transform = `translate3d(0, ${-Number(char)}em, 0)`;
    index += 1;
  }
}
