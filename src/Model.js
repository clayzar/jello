const { config, getClient } = require('./Jello')
const Collection = require('./Collection')

const ErrorBag = require('./ErrorBag')

const { attributeProxyHander, modelProcessStateProxyHandler } = require('./helpers/proxy')
const objectToFormData = require('./helpers/objectToFormData')
const getOptions = require('./helpers/getOptions')

const { reactive } = require('@vue/reactivity')

module.exports = class Model {

	constructor(data, options = {}) {
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
		this._attributes = reactive({})
		this._original = reactive({})
		this._changes = reactive({})
		this.errors = new ErrorBag()

		this.applySchema()

		if(data) {
			this.fill(data)
			this.is.loaded = true
		}

		return new Proxy(this, attributeProxyHander)
	}

	get $() {
		return this._original
	}

	get _(){
		return this._changes
	}	

	applySchema() {

		const schema = this.constructor.getSchema()
		const attributes = {}
		for(const key in schema) {
			attributes[key] = null
		}

		this._attributes = reactive(attributes)

		this._original = reactive({...attributes})
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
						if(data[attribute] instanceof Model) {
							if(data[attribute] instanceof schema[attribute]) {
								this._attributes[attribute] = data[attribute]
							} else {
								const expectedModelName = (new schema[attribute]).constructor.name
								const receivedModelName = data[attribute].constructor.name
								console.error(`Mismatched model class. Attempting to set property "${attribute}" on "${this.constructor.name}". Expect an instance of "${expectedModelName}" but got a "${receivedModelName}"`);
							}
 						} else {
							this._attributes[attribute] = schema[attribute].from(data[attribute])
 						}
					} else if(schema[attribute] == Date) {
						this._attributes[attribute] = Date(data[attribute])
					} else if(schema[attribute] == Number) {
						this._attributes[attribute] = Number(data[attribute])
					} else if(schema[attribute] == Boolean) {
						this._attributes[attribute] = Boolean(data[attribute])
					} else if(schema[attribute] == String) {
						this._attributes[attribute] = String(data[attribute])
					} else if(typeof schema[attribute] == 'function') {
						this._attributes[attribute] = schema[attribute](data[attribute])
					}
				}
			}
		}

		if(!this.is.loaded) {
			this._original = reactive({...this._attributes})
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

		const request = this._promise = getClient(options.client).get(path)
			.finally(result => {
				this._promise = null
				return result
			})
			.then(response => {
				if(options.models.wrapped === false) {
					return response.data
				} else {
					return response.data[options.models.wrapped]
				}
			})
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

		this.errors.clear()

		this.is.saving = true

		options = getOptions(config(), this._options, options)

		const data = this.toPlain()

		const method = this[this.getKeyName()] ? 'put' : 'post'
		
		const request = this._promise = getClient(options.client)[method](path, data)
			.finally(result => {
				// console.log('Model.js: finally:', result);
				this._promise = null
				return result
			})
			.catch(error => {
				// console.log('Model.js: catch:', error);
				if(error.response.status == 422) {
					this.errors.record(error.response.data.errors)
				}

				throw error
			})
			.then(response => {
				// console.log('Model.js: wrap check', response);
				if(options.models.wrapped === false) {
					return response.data
				} else {
					return response.data[options.models.wrapped]
				}
			})
			.then(data => {
				// console.log('Model.js: merge check', data);
				if(options.models.saved.merge) {
					this._attributes = reactive(Object.assign({}, this._attributes, data))
				}
				this.applyChanges()
				return data
			})
			.finally(result => {
				this.is.saving = false
				return result
			})

		return this
	}

	getKeyName() {
		return 'id'
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
		this._attributes = reactive({...this._original})
	}

	applyChanges() {
		this._changes = reactive({
			...this._changes,
			...this.getDirty(),
		})

		this._original = reactive({...this._attributes})
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