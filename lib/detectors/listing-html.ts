import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';

const lineBreak = /^(?:p|div|li|br|h[1-4]|tr)$/;
const ignored = /^(?:script|style|iframe)$/;

function textOf(node: DefaultTreeAdapterTypes.ParentNode, breaks: boolean, depth = 0): string {
  if (depth >= 128) return '';
  return node.childNodes.map(child => {
    if ('value' in child) return child.value;
    if (!('tagName' in child) || ignored.test(child.tagName)) return '';
    return textOf(child, breaks, depth + 1) + (breaks && lineBreak.test(child.tagName) ? '\n' : '');
  }).join('');
}

export function listingText(html: string) {
  return textOf(parseFragment(html), true);
}

export function jobstreetListingFragment(doc: Document, html: string) {
  const detached = doc.implementation.createHTMLDocument();
  const fragment = detached.createDocumentFragment();
  function collect(node: DefaultTreeAdapterTypes.ParentNode, depth = 0) {
    if (depth >= 128) return;
    for (const child of node.childNodes) {
      if (!('tagName' in child)) continue;
      if (child.tagName === 'script' && child.attrs.some(attr => attr.name === 'type' && attr.value === 'application/ld+json')) {
        const script = detached.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = textOf(child, false);
        fragment.append(script);
        continue;
      }
      if (ignored.test(child.tagName)) continue;
      const field = child.attrs.find(attr => attr.name === 'data-automation');
      if (field) {
        const item = detached.createElement('div');
        item.setAttribute('data-automation', field.value);
        item.textContent = textOf(child, false);
        fragment.append(item);
      }
      collect(child, depth + 1);
    }
  }
  collect(parseFragment(html));
  return fragment;
}
