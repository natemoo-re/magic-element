import type { JSX } from 'preact';

export function jsx(
	type: string,
	props: JSX.HTMLAttributes &
		JSX.SVGAttributes &
		Record<string, any> & { children?: ComponentChild }
): HTMLElement;

/**
 * JSX.Element factory used by Babel's {runtime:"automatic"} JSX transform
 * @param {VNode['type']} type
 * @param {VNode['props']} props
 * @param {VNode['key']} [key]
 * @param {unknown} [isStaticChildren]
 * @param {unknown} [__source]
 * @param {unknown} [__self]
 */
export function h(type, props, ...children) {
	let normalizedProps = {},
		ref,
		i;
	for (i in props) {
		if (i == 'ref') {
			ref = props[i];
		} else {
			normalizedProps[i] = props[i];
		}
	}

	const vnode = {
		type,
		props: normalizedProps,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_nextDom: undefined,
		_component: null,
		_hydrating: null,
		constructor: undefined,
		_original: --vnodeId,
		__source,
		__self,
	};

	if (typeof type === 'function' && (ref = type.defaultProps)) {
		for (i in ref)
			if (typeof normalizedProps[i] === 'undefined') {
				normalizedProps[i] = ref[i];
			}
	}

	if (options.vnode) options.vnode(vnode);
	return vnode;
}

export function h(tag: string, props: Record<string, any>);
export function h(tag: string, props: Record<string, any> = {}) {
	const el = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key in el) {
			el[key] = value;
		} else {
			el.setAttribute(key, value);
		}
	}
	return el;
}

export function refs(node: Element) {
	return Object.fromEntries(
		[...node.querySelectorAll(`[data-ref]`)].map((ref: HTMLElement) => [ref.dataset.ref, ref])
	);
}

export function template(name: string) {
	return (
		document.querySelector(`template[data-template="${name}"]`) as HTMLTemplateElement
	).content.cloneNode(true);
}

export function action(name: string, callback: any) {
	const el = document.querySelector(`[data-action="${name}"`) as HTMLElement;
	const on = el.dataset.on ?? 'click';
	el.addEventListener(on, callback);
	return () => {
		el.removeEventListener(on, callback);
	};
}
