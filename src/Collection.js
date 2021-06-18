import Jello from './Jello'

export default class Collection {

	constructor(options = {})
	{
		this.options = {
			client: Jello.client(options.client),
			path: options.path,
			params: options.params,
			model: options.model,
			paginate: options.paginate, // false | normal | infinite
			map: options.map
		}

		this.items = []
		this.meta = {}
		this.links = {}

		this.loading = false
		this.loaded = false
	}

	load(options = {})
	{
		if(this.loading) {
			return Promise.reject('Already loading')
		}

		this.loading = true

		let params = {
			...this.params,
			...options.params
		}

		if(this.options.paginate) {
			params.page = params.page || this.meta.current_page + 1
		}

		return this.options.client
		.request({
			method: 'GET',
			url: options.path || this.options.path,
			params: params,
			...options.config
		})
		.then(response => response.data)
		.then(result => {
			let models = this.options.model.hydrate(result.data)

			if(this.options.map instanceof Function) {
				models = models.map(this.options.map)
			}

			if(this.options.paginate && this.options.paginate == 'infinite') {
				this.items = this.items.concat(models)
			} else {
				this.items = models
			}

			this.meta = result.meta
			this.links = result.links

			return this.items
		})
		.finally(() => {
			this.loading = false
			this.loaded = true
		})
	}

	prev() {
		if(this.options.paginate == 'infinite') {
			console.error('Cannot load previous pages when pagination is infinite');
			return;
		}

		if(this.meta.current_page <= 1) {
			console.warn('No previous page for jello collection.', this)
		} else {
			return this.load({params: {page: this.meta.current_page - 1}})
		}
	}

	next() {
		return this.load({params: {page: this.meta.current_page + 1}})
	}
}