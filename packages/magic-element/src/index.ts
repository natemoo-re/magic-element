const TEMPLATE_RE = /({)?{{[^{}]*}}(?!})/g;
const ZWJ = String.fromCharCode(8205);

function getExpressions(value: string) {
	TEMPLATE_RE.lastIndex = 0;
	let m: RegExpExecArray | null = null;
	let results: { value: string; index: number, lastIndex: number }[] = [];
	while ((m = TEMPLATE_RE.exec(value))) {
		const value = m[0].slice(2, -2).trim();
		results.push({ value, index: m.index, lastIndex: m.index + m[0].length });
	}
	return results;
}
function isExpression(value: string) {
	TEMPLATE_RE.lastIndex = 0;
	return TEMPLATE_RE.test(value.trim());
}
function isText(node: Node): node is Text {
	return node.nodeType === node.TEXT_NODE;
}
function isElement(node: Node): node is Element {
	return node.nodeType === node.ELEMENT_NODE;
}
function coerce(value: string) {
	if (value === 'false' || value === 'true') return value === 'true';
	if (!Number.isNaN(value)) return Number(value);
	return value;
}
function bindAttr(host: HTMLElement, attr: Attr) {
	const parent = attr.ownerElement as HTMLElement;
	const value = attr.value;
	const names: string[] = [];
	const nodes: string[] = [];
	let prev = 0;
	for (const match of getExpressions(attr.value)) {
		const text = value.slice(prev, match.index) ?? '';
		const current = '';
		const index = nodes.push(text, current) - 1;
		const name =
			attr.name === 'style'
				? text.split(';').at(-1)?.trim().replace(/\:$/, '')
				: undefined;
		if (name) {
			names.push(name);
		}
		Object.defineProperty(host, match.value, {
			get() {
				if (name) return parent.style.getPropertyValue(name);
				return coerce(nodes[index]);
			},
			set(value) {
				if (name) return parent.style.setProperty(name, value);

				let remove = false;
				if (value === undefined) {
					nodes[index] = '';
					remove = true;
				} else {
					nodes[index] = typeof value === 'string' ? value : String(value);
				}
				const attrValue = nodes.join('');
				if (!attrValue && remove) {
					parent.removeAttribute(attr.name);
				} else {
					attr.value = attrValue;
					parent.setAttributeNode(attr);
				}
			},
			enumerable: true,
		});
		prev = match.lastIndex;
	}
	nodes.push(attr.value.slice(prev));
	if (attr.name === 'style') {
		for (const name of names) {
			parent.style.removeProperty(name);
		}
		if (names.length === 1) {
			parent.removeAttribute('style');
		}
	} else {
		attr.value = nodes.join('');
		parent.setAttributeNode(attr);
	}
}
function bindEventHandler(host: HTMLElement, attr: Attr) {
	const parent = attr.ownerElement as HTMLElement;
	const { name, value: fn } = attr;
	parent.addEventListener(name.slice(1), (event) => {
		return new Function('$', 'event', fn).call(parent, host, event)
	})
	parent.removeAttributeNode(attr);
}
function bindText(host: HTMLElement, node: Text) {
	const value = node.data;
	const nodes: Text[] = [];
	let prev = 0;
	for (const match of getExpressions(value)) {
		const text = value.slice(prev, match.index) ?? ZWJ;
		const textNode = new Text(ZWJ);
		nodes.push(new Text(text), textNode);
		Object.defineProperty(host, match.value, {
			get() {
				return coerce(textNode.data);
			},
			set(value) {
				textNode.data = `${value}`;
			},
			enumerable: true,
		});
		prev = match.lastIndex;
	}
	nodes.push(new Text(value.slice(prev)));
	node.replaceWith(...nodes);
}

const globalStyles = new CSSStyleSheet();
const hostStyles = new CSSStyleSheet();
hostStyles.insertRule(':host { display: contents; }');

function getAdoptedStyles() {
	if (globalStyles.cssRules.length === 0) {
		const rules = Array.from(document.styleSheets)
			.map((sheet) => Array.from(sheet.cssRules))
			.flat();
		let index = 0;
		for (const rule of rules) {
			if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
				continue;
			}
			globalStyles.insertRule(rule.cssText, index++);
		}
	}
	return [hostStyles, globalStyles];
}
class MagicElement extends HTMLElement {
	#template: HTMLTemplateElement;
	#children: Node;

	constructor() {
		super();
		const source = document.querySelector(`template[data-name="${this.localName}"]`) as HTMLTemplateElement;
		for (const attr of source.attributes) {
			if (attr.name === 'data-name') continue;
			this.setAttribute(attr.name, attr.value);
		}
		this.#template = document.querySelector(
			`template[data-name="${this.localName}"]`
		) as HTMLTemplateElement;
		const children = this.#template.content.cloneNode(true) as DocumentFragment;
		const walker = document.createNodeIterator(
			children,
			NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
		);

		let node: Node | null;
		const actions: any[] = [];
		const processNode = (node?: Node) => {
			if (!node) return;
			if (isElement(node)) {
				for (const attr of node.attributes) {
					if (isExpression(attr.value)) {
						bindAttr(this, attr);
					} else if (attr.name.startsWith('@')) {
						actions.push(() => bindEventHandler(this, attr));
					}
				}
			} else if (isText(node)) {
				if (!node.data.trim()) return;
				if (isExpression(node.data ?? '')) {
					bindText(this, node);
				}
			}
		};
		while ((node = walker.nextNode())) {
			processNode(node);
		}
		for (const action of actions) {
			action()
		}

		this.#children = children;
		const shadow = this.attachShadow({ mode: 'open' });
		shadow.replaceChildren(this.#children);
		shadow.adoptedStyleSheets = getAdoptedStyles();
	}

	connectedCallback() {
		for (const attribute of this.attributes) {
			// Reflect attributes created before initialization
			(this as any)[attribute.name] = attribute.value;
			this.removeAttributeNode(attribute)
		}
	}
}

export function init() {
	for (const template of document.querySelectorAll('template[data-name]')) {
		const name = (template as HTMLElement).dataset.name!;
		customElements.define(name, class extends MagicElement { });
	}
}
