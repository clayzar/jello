import moment from 'moment-timezone'
import { config, getClient } from './Jello'
import Collection from './Collection'

import { attributeProxyHander, modelProcessStateProxyHandler } from './helpers/proxy'
import objectToFormData from './helpers/objectToFormData'
import getOptions from './helpers/getOptions'

export default class Model {

	constructor(data, options = {})
	{
		this.is = new Proxy({
			loading: false,
			loaded: false,
			saving: false,
			busy: false,
		}, modelProcessStateProxyHandler)

		this._options = getOptions({
			path: null,
			client: null
		}, options)

		this._promise = null
		this._attributes = {}
		this._original = {}
		this._changes = {}	

		this.applySchema()

		if(data) {
			this.fill(data)
			this.is.loaded = true
		}

		return new Proxy(this, attributeProxyHander)
	}

	applySchema() {
		const schema = this.constructor.getSchema()
		for(const key in schema) {
			this._attributes[key] = null

			// const valueType = schema[key]

			// if(!valueType instanceof Function) {
			// 	if(valueType instanceof Array) {
			// 		this[key] = []
			// 	} else if(valueType instanceof Object) {
			// 		this[key] = valueType
			// 	}
			// }
		}
	}

	/*
	 * Creates a new array of instantiated objects from the supplied data array
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
		object.is.loaded = true

		return object
	}

	fill(data) {
		for(const attribute in data) {

			this._attributes[attribute] = data[attribute]

			if(!data[attribute]) {
				continue
			}

			const schema = this.constructor.getSchema()

			if(schema) {
				if(attribute in schema) {
					if(Array.isArray(schema[attribute])) {
						if(!Array.isArray(data[attribute])) {
							console.error(`Mismatch cast specified, both either must be an array or not an array. Attribute: ${attribute}`, Object.getPrototypeOf(this), data, schema)
						} else {
							const [classConstructor, parentAttribute] = schema[attribute]
							const parent = Object.getPrototypeOf(classConstructor)

							if(parent != Model) {
								console.error('The class specified for array attribute does not inherit from the base Model class.');
							} else {
								this._attributes[attribute] = classConstructor.hydrate(data[attribute])
								if(parentAttribute) {
									this._attributes[attribute].forEach(child => {
										child.attributes[parentAttribute] = this
									})
								}
							}
						}
					} else if(Object.getPrototypeOf(schema[attribute]) == Model) {
						this._attributes[attribute] = schema[attribute].from(data[attribute])
					} else if(schema[attribute] == Date) {
						this._attributes[attribute] = moment(data[attribute])
					} else if(schema[attribute] == Number) {
						this._attributes[attribute] = Number(data[attribute])
					} else if(schema[attribute] == Boolean) {
						this._attributes[attribute] = Boolean(data[attribute])
					}
				}
			}
		}

		if(!this.is.loaded) {
			this._original = this._attributes
		}

		if(Object.keys(data).length) {
			this.filled()
		}

		return this
	}

	load(path, options = {}) {
		if(this.is.loading) {
			return
		}

		this.is.loading = true

		options = getOptions(config(), this._options, options)
		
		path = path || this._options.path

		this._promise = getClient(options.client).get(path, options)
			.then(response => response.data.data)
			.then(data => {
				this.fill(data)
				this.is.loaded = true
				return this
			})
			.finally(result => {
				this.is.loading = false
				return result
			})

		return this
	}

	static load(path, options = {}) {
		return (new this()).load(...arguments)
	}

	save(path, options = {}) {
		if(this.is.saving) {
			return
		}

		this.is.saving = true

		options = getOptions(config(), this._options, options)
		
		const data = objectToFormData(this.toPlain())

		return getClient(options.client).post(path, data)
		.then(response => response.data.data)
		.then(data => {
			if(options.models.saved.merge) {
				this._attributes = Object.assign({}, this._attributes, data)
			}
			this.applyChanges()
			return data			
		})
		.finally(result => {
			this.is.saving = false
			return result
		})
	}

	toPlain() {
		const data = {}
		
		for(const [key, value] of Object.entries(this._attributes)) {
			const isAModel = (() => {
				try {
					return Object.getPrototypeOf(Object.getPrototypeOf(value).constructor) == Model
				} catch {
					return false
				}
			})()

			if(value && isAModel) {
				data[key] = value.toPlain()
			} else {
				data[key] = value
			}
		}

		return data
	}

	isDirty(attributes) {
		return this.getAttributes(attributes).reduce((acc, attribute) => {
			return acc || this._original[attribute] != this._attributes[attribute]
		}, false)
 	}

 	getDirty(attributes) {
 		const dirty = {}
 		
 		for(const attribute of this.getAttributes(attributes)) {
 			if(this._original[attribute] != this._attributes[attribute]) {
	 			dirty[attribute] = this._attributes[attribute]
 			}
 		}

 		return dirty
 	}

	revertChanges() {
		this._attributes = this._original
	}

	applyChanges() {
		this._changes = {
			...this._changes,
			...this.getDirty(),
		}

		this._original = this._attributes
	}

	wasChanged(attributes) {
		return this.getAttributes(attributes).filter(a => a in this._changes).length
	}

 	getAttributes(attributes) {
		if(!attributes) {
			attributes = Object.keys(this._attributes)
		}

		if(!Array.isArray(attributes)) {
			attributes = [attributes]
		}

		return attributes
 	}
	/*
	 * Called when the object has been loaded and filled (it's attributes have all been assigned.)
	 * This can be overriden on subclasses of Model if addtional processing is necessary.
	 */
	filled() {}

	static getSchema() {
		let schema = this.schema
		if(schema instanceof Function) {
			schema = schema()
		}
		return schema
	}

	static collection(options) {
		return new Collection({
			model: this,
			...options
		})
	}	
}