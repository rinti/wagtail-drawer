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

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file = "src/App.svelte";

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.child = list[i];
		return child_ctx;
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.item = list[i];
		return child_ctx;
	}

	// (29:12) {#if item.meta.children}
	function create_if_block_2(ctx) {
		var t;

		return {
			c: function create() {
				t = text(">");
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (31:8) {#if item.items}
	function create_if_block(ctx) {
		var ul;

		var each_value_1 = ctx.item.items;

		var each_blocks = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		return {
			c: function create() {
				ul = element("ul");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				add_location(ul, file, 31, 12, 805);
			},

			m: function mount(target, anchor) {
				insert(target, ul, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(ul, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.data) {
					each_value_1 = ctx.item.items;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block_1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(ul, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value_1.length;
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(ul);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (35:24) {#if child.meta.children}
	function create_if_block_1(ctx) {
		var t;

		return {
			c: function create() {
				t = text(">");
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (33:16) {#each item.items as child}
	function create_each_block_1(ctx) {
		var a, t0, t1_value = ctx.child.title, t1, dispose;

		var if_block = (ctx.child.meta.children) && create_if_block_1(ctx);

		function click_handler_1(...args) {
			return ctx.click_handler_1(ctx, ...args);
		}

		return {
			c: function create() {
				a = element("a");
				if (if_block) if_block.c();
				t0 = space();
				t1 = text(t1_value);
				a.href = "";
				add_location(a, file, 33, 20, 874);
				dispose = listen(a, "click", click_handler_1);
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				if (if_block) if_block.m(a, null);
				append(a, t0);
				append(a, t1);
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				if (ctx.child.meta.children) {
					if (!if_block) {
						if_block = create_if_block_1(ctx);
						if_block.c();
						if_block.m(a, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.data) && t1_value !== (t1_value = ctx.child.title)) {
					set_data(t1, t1_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				if (if_block) if_block.d();
				dispose();
			}
		};
	}

	// (26:0) {#each data.items as item}
	function create_each_block(ctx) {
		var li, a, t0, t1_value = ctx.item.title, t1, t2, t3, dispose;

		var if_block0 = (ctx.item.meta.children) && create_if_block_2(ctx);

		function click_handler(...args) {
			return ctx.click_handler(ctx, ...args);
		}

		var if_block1 = (ctx.item.items) && create_if_block(ctx);

		return {
			c: function create() {
				li = element("li");
				a = element("a");
				if (if_block0) if_block0.c();
				t0 = space();
				t1 = text(t1_value);
				t2 = space();
				if (if_block1) if_block1.c();
				t3 = space();
				a.href = "#";
				add_location(a, file, 27, 8, 642);
				add_location(li, file, 26, 4, 629);
				dispose = listen(a, "click", click_handler);
			},

			m: function mount(target, anchor) {
				insert(target, li, anchor);
				append(li, a);
				if (if_block0) if_block0.m(a, null);
				append(a, t0);
				append(a, t1);
				append(li, t2);
				if (if_block1) if_block1.m(li, null);
				append(li, t3);
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				if (ctx.item.meta.children) {
					if (!if_block0) {
						if_block0 = create_if_block_2(ctx);
						if_block0.c();
						if_block0.m(a, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if ((changed.data) && t1_value !== (t1_value = ctx.item.title)) {
					set_data(t1, t1_value);
				}

				if (ctx.item.items) {
					if (if_block1) {
						if_block1.p(changed, ctx);
					} else {
						if_block1 = create_if_block(ctx);
						if_block1.c();
						if_block1.m(li, t3);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				dispose();
			}
		};
	}

	function create_fragment(ctx) {
		var ul;

		var each_value = ctx.data.items;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				ul = element("ul");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				add_location(ul, file, 24, 0, 593);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, ul, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(ul, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.data) {
					each_value = ctx.data.items;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(ul, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(ul);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { data = {items: []}, mock = true } = $$props;

	    const fetchInitial = async () => {
	        const response = await fetch('http://localhost:8000/admin/api/v2beta/pages/?child_of=1&for_explorer=1');
	        $$invalidate('data', data = await response.json());
	        console.log(data);
	    };

	    const fetchChildren = async (e, item) => {
	        e.preventDefault();
	        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000');

	        const response = await fetch(url);
	        $$invalidate('data', data = await response.json());
	    };

	    fetchInitial();

		function click_handler({ item }, e) {
			return fetchChildren(e, item);
		}

		function click_handler_1({ child }, e) {
			return fetchChildren(e, child);
		}

		$$self.$set = $$props => {
			if ('data' in $$props) $$invalidate('data', data = $$props.data);
			if ('mock' in $$props) $$invalidate('mock', mock = $$props.mock);
		};

		return {
			data,
			mock,
			fetchChildren,
			click_handler,
			click_handler_1
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["data", "mock"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.data === undefined && !('data' in props)) {
				console.warn("<App> was created without expected prop 'data'");
			}
			if (ctx.mock === undefined && !('mock' in props)) {
				console.warn("<App> was created without expected prop 'mock'");
			}
		}

		get data() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set data(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get mock() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set mock(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
