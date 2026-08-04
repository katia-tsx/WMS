// Shared Shadow DOM styling helper for all wms-* components.
// Constructable stylesheets are cached per component tag so every instance
// of e.g. <wms-button> shares one parsed CSSStyleSheet instead of re-parsing
// a <style> tag per element.

const sheetCache = new Map();

function getStyleSheet(key, cssText) {
  let sheet = sheetCache.get(key);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(key, sheet);
  }
  return sheet;
}

export function attachStyles(shadowRoot, key, cssText) {
  if ('adoptedStyleSheets' in Document.prototype) {
    shadowRoot.adoptedStyleSheets = [getStyleSheet(key, cssText)];
  } else {
    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.prepend(style);
  }
}
