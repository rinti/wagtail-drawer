var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src/Item.svelte generated by Svelte v3.1.0 */

	const file = "src/Item.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.child = list[i];
		return child_ctx;
	}

	// (32:4) {#if children.length > 0}
	function create_if_block(ctx) {
		var each_1_anchor, current;

		var each_value = ctx.children;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function create() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},

			m: function mount(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(target, anchor);
				}

				insert(target, each_1_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.children) {
					each_value = ctx.children;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(each_1_anchor);
				}
			}
		};
	}

	// (33:8) {#each children as child}
	function create_each_block(ctx) {
		var current;

		var item_1 = new Item({
			props: { item: ctx.child },
			$$inline: true
		});

		return {
			c: function create() {
				item_1.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(item_1, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var item_1_changes = {};
				if (changed.children) item_1_changes.item = ctx.child;
				item_1.$set(item_1_changes);
			},

			i: function intro(local) {
				if (current) return;
				item_1.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				item_1.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				item_1.$destroy(detaching);
			}
		};
	}

	function create_fragment(ctx) {
		var div, a, t0_value = ctx.item.title, t0, a_class_value, t1, current, dispose;

		var if_block = (ctx.children.length > 0) && create_if_block(ctx);

		return {
			c: function create() {
				div = element("div");
				a = element("a");
				t0 = text(t0_value);
				t1 = space();
				if (if_block) if_block.c();
				a.href = "#";
				a.className = a_class_value = "Item__Link " + ctx.linkClasses + " svelte-wn34jl";
				add_location(a, file, 28, 4, 709);
				div.className = "Item svelte-wn34jl";
				add_location(div, file, 27, 0, 686);
				dispose = listen(a, "click", ctx.click_handler);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, a);
				append(a, t0);
				append(div, t1);
				if (if_block) if_block.m(div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if ((!current || changed.item) && t0_value !== (t0_value = ctx.item.title)) {
					set_data(t0, t0_value);
				}

				if ((!current || changed.linkClasses) && a_class_value !== (a_class_value = "Item__Link " + ctx.linkClasses + " svelte-wn34jl")) {
					a.className = a_class_value;
				}

				if (ctx.children.length > 0) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(div, null);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if (if_block) if_block.d();
				dispose();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let children = [];
	    let { item } = $$props;

	    const fetchChildren = async () => {
	        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000');
	        const response = await fetch(`${url}&for_explorer=1`);

	        const data = await response.json();
	        $$invalidate('children', children = data.items);
	    };

		function click_handler() {
			return fetchChildren(item);
		}

		$$self.$set = $$props => {
			if ('item' in $$props) $$invalidate('item', item = $$props.item);
		};

		let hasChildren, linkClasses;
		$$self.$$.update = ($$dirty = { item: 1, hasChildren: 1 }) => {
			if ($$dirty.item) { $$invalidate('hasChildren', hasChildren = item.meta.children && item.meta.children.count > 0); }
			if ($$dirty.hasChildren) { $$invalidate('linkClasses', linkClasses = hasChildren ? 'icon icon-folder-inverse' : 'icon icon-doc-full-inverse'); }
		};

		return {
			children,
			item,
			fetchChildren,
			linkClasses,
			click_handler
		};
	}

	class Item extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["item"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.item === undefined && !('item' in props)) {
				console.warn("<Item> was created without expected prop 'item'");
			}
		}

		get item() {
			throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set item(value) {
			throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file$1 = "src/App.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.item = list[i];
		return child_ctx;
	}

	// (59:8) {#each topLevelItems(items) as item}
	function create_each_block$1(ctx) {
		var current;

		var item = new Item({
			props: { item: ctx.item },
			$$inline: true
		});

		return {
			c: function create() {
				item.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(item, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var item_changes = {};
				if (changed.topLevelItems || changed.items) item_changes.item = ctx.item;
				item.$set(item_changes);
			},

			i: function intro(local) {
				if (current) return;
				item.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				item.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				item.$destroy(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		var div1, div0, div1_class_value, current;

		var each_value = ctx.topLevelItems(ctx.items);

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		function outro_block(i, detaching, local) {
			if (each_blocks[i]) {
				if (detaching) {
					on_outro(() => {
						each_blocks[i].d(detaching);
						each_blocks[i] = null;
					});
				}

				each_blocks[i].o(local);
			}
		}

		return {
			c: function create() {
				div1 = element("div");
				div0 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div0.className = "Drawer__Container";
				add_location(div0, file$1, 57, 4, 1412);
				div1.className = div1_class_value = "Drawer " + ctx.classes + " svelte-1gtbgfj";
				add_location(div1, file$1, 56, 0, 1377);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div0, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.topLevelItems || changed.items) {
					each_value = ctx.topLevelItems(ctx.items);

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
							each_blocks[i].i(1);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].i(1);
							each_blocks[i].m(div0, null);
						}
					}

					group_outros();
					for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
					check_outros();
				}

				if ((!current || changed.classes) && div1_class_value !== (div1_class_value = "Drawer " + ctx.classes + " svelte-1gtbgfj")) {
					div1.className = div1_class_value;
				}
			},

			i: function intro(local) {
				if (current) return;
				for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

				current = true;
			},

			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);
				for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div1);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

	    let items = [];
	    let isOpen = false;

	    const fetchInitial = async () => {
	        const response = await fetch('http://localhost:8000/admin/api/v2beta/pages/?child_of=1&for_explorer=1');
	        const data = await response.json();
	        $$invalidate('items', items = data.items);
	    };

	    const topLevelItems = () => {
	        const x = items.filter(item => item.parent === undefined);
	        return x
	    };

	    onMount(() => {
	        // Todo: Remove this hack
	        setTimeout(() => {
	            const clickEl = document.querySelector('[data-drawer-menu-item]');
	            clickEl.addEventListener('click', (e) => {
	                e.preventDefault();
	                $$invalidate('isOpen', isOpen = !isOpen);
	            });
	        }, 1000);
	    });

	    fetchInitial();

		let classes;
		$$self.$$.update = ($$dirty = { isOpen: 1 }) => {
			if ($$dirty.isOpen) { $$invalidate('classes', classes = isOpen ? 'Drawer--open' : ''); }
		};

		return { items, topLevelItems, classes };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

}());
//# sourceMappingURL=wagtail-drawer.js.map
