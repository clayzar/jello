import Jello from './Jello';

import { modelProcessStateProxyHandler } from './helpers/proxy';
import getOptions from './helpers/getOptions';

import { reactive } from '@vue/reactivity';

export default class Collection {
	constructor(options = {}) {
		this.options = options;

		this.is = reactive(
			new Proxy(
				{
					loading: false,
					loaded: false,
					busy: false,
				},
				modelProcessStateProxyHandler,
			),
		);

		this.items = [];
		this.meta = {};
		this.links = {};
		this.extra = {};
		this.loadedPageRange = {
			min: null,
			max: null,
		};

		if (options.load === true) {
			this.load();
		}
	}

	get are() {
		return this.is;
	}

	[Symbol.iterator]() {
		let index = 0;
		return {
			next: () => ({
				done: this.items.length === 0 || index >= this.items.length,
				value: this.items[index++],
			}),
		};
	}

	load(options = {}) {
		options = getOptions(Jello.config(), this.options, options);

		if (this.are.loading) {
			return Promise.reject('Already loading: ' + options.path);
		}

		this.are.loading = true;

		const params = options.params || {};

		if (this.are.loaded && params.seek) {
			delete params.seek;
		}

		const paginate = options.collections.paginate || options.paginate;

		if ([true, 'auto'].includes(paginate) && !params.seek) {
			params.page = params.page || this.meta?.current_page || 1;
		}

		return Jello.getClient(options.client)
			.request({
				method: 'GET',
				url: options.path,
				params: params,
				...options.config,
			})
			.then((response) => response.data)
			.then((result) => {
				let models = options.model.hydrate(result.data);

				models.forEach((m) => m.loaded?.());

				if (options.map instanceof Function) {
					models = models.map(options.map);
				}

				if (options.paginate === 'infinite') {
					if (this.loadedPageRange.min === null) {
						this.items = models;
					} else if (result.meta.current_page < this.loadedPageRange.min) {
						this.items = models.concat(this.items);
					} else {
						this.items = this.items.concat(models);
					}
				} else {
					this.items = models;
				}

				this.meta = result.meta;
				this.links = result.links;

				if (options.paginate === 'infinite') {
					if (this.loadedPageRange.min == null) {
						this.loadedPageRange.min = result.meta.current_page;
						this.loadedPageRange.max = result.meta.current_page;
					} else {
						this.loadedPageRange.min = Math.min(result.meta.current_page, this.loadedPageRange.min);
						this.loadedPageRange.max = Math.max(result.meta.current_page, this.loadedPageRange.max);
					}
				}

				// Append extra keys
				const { data, meta, links, ...rest } = result;
				this.extra = rest;

				this.are.loaded = true;

				return this.items;
			})
			.finally(() => {
				this.are.loading = false;
			});
	}

	prev() {
		if (this.hasPrev) {
			var prevPage;

			if (this.options.paginate === 'infinite') {
				prevPage = this.loadedPageRange.min - 1;
			} else {
				prevPage = this.meta.current_page - 1;
			}

			return this.load({ params: { page: prevPage } });
		}

		console.warn('No prev page');
	}

	next() {
		if (this.hasNext) {
			var nextPage;

			if (this.options.paginate === 'infinite') {
				nextPage = this.loadedPageRange.max + 1;
			} else {
				nextPage = this.meta.current_page + 1;
			}

			return this.load({ params: { page: nextPage } });
		}

		console.warn('No next page');
	}

	get hasPrev() {
		if (this.options.paginate === 'infinite') {
			return this.loadedPageRange.min > 1;
		} else if (this.meta) {
			return this.meta.current_page > 1;
		}
	}

	get hasNext() {
		if (this.meta) {
			if (!this.meta.last_page) {
				return this.items.length % this.meta.per_page === 0 && this.meta.from != null;
			}

			if (this.options.paginate === 'infinite') {
				return this.loadedPageRange.max < this.meta.last_page;
			} else {
				return this.meta.current_page < this.meta.last_page;
			}
		}

		return false;
	}
}
