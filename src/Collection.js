import Jello from './Jello'

import { modelProcessStateProxyHandler } from './helpers/proxy'
import getOptions from './helpers/getOptions'

export default class Collection {

	constructor(options = {}) {
			
		this.options = options

		this.are = new Proxy({
			loading: false,
			loaded: false,
			busy: false,
		}, modelProcessStateProxyHandler)

		this.items = []
		this.meta = {}
		this.links = {}
		this.extra = {}
		this.loadedPageRange = {
			min: null,
			max: null,
		}

		if(options.load === true) {
			this.load()
		}
	}

	[Symbol.iterator]() {
		let index = 0
		return {
			next: () => ({
				done: this.items.length == 0 || index >= this.items.length,
				value: this.items[index++]
			})
		}
	}

	load(options = {}) {
		if(this.are.loading) {
			return Promise.reject('Already loading')
		}

		this.are.loading = true

		options = getOptions(Jello.config(), this.options, options)
		
		const params = options.params || {}

		if(this.are.loaded && params.seek) {
			delete params.seek
		}

		if(options.collections.paginate && !params.seek) {
			params.page = params.page || this.meta.current_page || 1
		}

		return Jello.getClient(options.client)
		.request({
			method: 'GET',
			url: options.path,
			params: params,
			...options.config
		})
		.then(response => response.data)
		.then(result => {
			let models = options.model.hydrate(result.data)

			if(options.map instanceof Function) {
				models = models.map(options.map)
			}

			if(options.paginate == 'infinite') {
				if(this.loadedPageRange.min == null) {
					this.items = models
				} else if(result.meta.current_page < this.loadedPageRange.min) {
					this.items = models.concat(this.items)
				} else {
					this.items = this.items.concat(models)
				}
			} else {
				this.items = models
			}

			this.meta = result.meta
			this.links = result.links
			if(options.paginate == 'infinite') {
				if(this.loadedPageRange.min == null) {
					this.loadedPageRange.min = result.meta.current_page
					this.loadedPageRange.max = result.meta.current_page
				} else {
					this.loadedPageRange.min = Math.min(result.meta.current_page, this.loadedPageRange.min)
					this.loadedPageRange.max = Math.max(result.meta.current_page, this.loadedPageRange.max)
				}
			}

			// Append extra keys
			const { data, meta, links, ...rest } = result
			this.extra = rest

			this.are.loaded = true

			return this.items
		})
		.finally(() => {
			this.are.loading = false
		})
	}

	get prev() {
		if(this.hasPrev) {
			return () => {
				var prevPage
			
				if(this.options.paginate == 'infinite') {
					prevPage = this.loadedPageRange.min - 1
				} else {
					prevPage = this.meta.current_page - 1
				}

				return this.load({params: {page: prevPage}})
			}
		}

		// if(prevPage < 1) {
		// 	console.warn('No previous page for jello collection.', this)
		// 	return Promise.reject('There is not a previous page for this list.')
		// }

	}

	get next() {
		if(this.hasNext) {
			return () => {
				var nextPage
				
				if(this.options.paginate == 'infinite') {
					nextPage = this.loadedPageRange.max + 1
				} else {
					nextPage = this.meta.current_page + 1
				}

				return this.load({params: {page: nextPage}})
			}	
		}
		//  else {}

		// if(nextPage > this.meta.last_page) {
		// 	console.warn('No next page for jello collection', this)
		// 	return Promise.reject('There is not a next page for this list.')
		// }

	}

	get hasPrev() {
		if(this.options.paginate == 'infinite') {
			return this.loadedPageRange.min > 1
		} else {
			return this.meta.current_page > 1
		}
	}


	get hasNext() {
		if(!this.meta.last_page) {
			return this.items.length % this.meta.per_page == 0 && this.meta.from != null
		}

		if(this.options.paginate == 'infinite') {
			return this.loadedPageRange.max < this.meta.last_page
		} else {
			return this.meta.current_page < this.meta.last_page
		}
	}

}