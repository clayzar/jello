import moment from 'moment-timezone'
import Jello from './Jello'
import Collection from './Collection'

export default class Model {

	constructor()
	{
		this._ = {}
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

		for(const attribute in data)
		{
			object[attribute] = data[attribute]

			if(this.casts) {
				if(attribute in this.casts) {
					if(Array.isArray(this.casts[attribute])) {
						if(!Array.isArray(data[attribute])) {
							console.error(`Mismatch cast specified, both either must be an array or not an array. Attribute: ${attribute}`)
						} else {
							const [classConstructor, parentAttribute] = this.casts[attribute]
							const parent = Object.getPrototypeOf(classConstructor)

							if(parent != Model) {
								console.error('The class specified for array attribute does not inherit from the base Model class.');
							} else {
								object[attribute] = classConstructor.hydrate(data[attribute])
								if(parentAttribute) {
									object[attribute].forEach(child => {
										child[parentAttribute] = object
									})
								}
							}
						}
					} else if(Object.getPrototypeOf(this.casts[attribute]) == Model) {
						object[attribute] = this.casts[attribute].from(data[attribute])
					} else if(this.casts[attribute] == Date) {
						object[attribute] = moment(data[attribute])
					}
				}
			}
		}

		object.loaded()

		object.isLoaded = true

		return object
	}

	static load(path, options = {}) {
		const clientKey = options.client
		const client = Jello.client(clientKey)
		const params = options.params

		return client.get(path, params)
		.then(response => response.data.data)
		.then(data => this.from(data))
	}

	static collection(options) {
		return new Collection({
			model: this,
			...options
		})
	}

	loaded()
	{
		// Called when the object has been loaded, ie. it's attributes have all been assigned
	}
}