import moment from 'moment-timezone'
import Jello from './Jello'
import Collection from './Collection'

export default class Model {

	constructor()
	{
		this._ = {
			path: null,
			promise: null
		}
		this.isLoaded = false
	}

	/*
	 * Creates a new array of instantiated object from the supplied data array
	 * @param array
	 */
	static hydrate(items) {
		return items.map((model) => {
			return this.from(model)
		})
	}

	/*
	 * Creates a new instance from the supplied data
	 * @param object
	 */
	static from(data) {
		const object = new this()

		object.fill(data)
		object.loaded()
		object.isLoaded = true

		return object
	}

	fill(data) {
		for(const attribute in data)
		{
			this[attribute] = data[attribute]

			const casts = this.constructor.casts
			if(casts) {
				if(attribute in casts) {
					if(Array.isArray(casts[attribute])) {
						if(!Array.isArray(data[attribute])) {
							console.error(`Mismatch cast specified, both either must be an array or not an array. Attribute: ${attribute}`)
						} else {
							const [classConstructor, parentAttribute] = casts[attribute]
							const parent = Object.getPrototypeOf(classConstructor)

							if(parent != Model) {
								console.error('The class specified for array attribute does not inherit from the base Model class.');
							} else {
								this[attribute] = classConstructor.hydrate(data[attribute])
								if(parentAttribute) {
									this[attribute].forEach(child => {
										child[parentAttribute] = this
									})
								}
							}
						}
					} else if(Object.getPrototypeOf(casts[attribute]) == Model) {
						this[attribute] = casts[attribute].from(data[attribute])
					} else if(casts[attribute] == Date) {
						this[attribute] = moment(data[attribute])
					}
				}
			}
		}

		return this
	}

	static load(path, options = {}) {
		return (new this()).loadFrom(path, options)
	}

	static collection(options) {
		return new Collection({
			model: this,
			...options
		})
	}

	loaded() {
		// Called when the object has been loaded, ie. it's attributes have all been assigned
	}

	loadFrom(path, options) {
		const clientKey = options.client
		const client = Jello.client(clientKey)
		const params = options.params
		this._.path = path
		this._.client = client

		this._.promise = client.get(path, params)
		.then(response => response.data.data)
		.then(data => {
			this.fill(data)
			this.loaded()
			this.isLoaded = true

			this.then = null
			return this
		})

		return this
	}

	then(callback) {
		this._.promise.then(callback)
		return this
	}

	catch(callback) {
		this._.promise.catch(callback)
		return this
	}

	finally(callback) {
		this._.promise.finally(callback)
		return this
	}

	// save() {
	// 	const { client, path } = this._

	// 	const data = this.data()

	// 	return client.post(path, data)
	// }
}