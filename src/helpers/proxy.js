module.exports.attributeProxyHander = {
	get(object, prop, proxy) {
		if(['then', 'catch', 'finally'].includes(prop)) {
			return (callback) => {
				if(!object.is.loaded) {
					object._promise[prop](callback)
					return proxy
				}

				return Promise.resolve(callback(object))
			}
		}

		if(prop == '$') {
			return object._original
		}

		if(object.hasOwnProperty(prop)) {
			return object[prop]
		}
		if(object._attributes.hasOwnProperty(prop)) {
			return object._attributes[prop]
		}

		return Reflect.get(...arguments)
	},
	set(object, prop, value, proxy) {
		if(object.hasOwnProperty(prop)) {
			object[prop] = value
		} else {
			object._attributes = {
				...object._attributes,
				[prop]: value
			}
		}

		return true
	},
	has: function (object, prop) {
		return object._attributes.hasOwnProperty(prop)
	},				
	// deleteProperty: function (oTarget, sKey) {
	// 	console.log('delete');
	// 	return Reflect.deleteProperty(...arguments)
	// },
	// enumerate: function (oTarget, sKey) {
	// 	console.log('enumerate');
	// 	return Reflect.enumerate(...arguments)
	// },
	// ownKeys: function (oTarget, sKey) {
	// 	console.log('ownKeys', sKey);
	// 	const keys = Reflect.ownKeys(...arguments)
	// 	console.log('here they are:', keys);
	// 	return keys
	// },
	// defineProperty: function (oTarget, sKey, oDesc) {
	// 	console.log('defineProperty', sKey, oDesc);
	// 	return Reflect.defineProperty(...arguments)
	// },				
}

module.exports.modelProcessStateProxyHandler = {
	set(object, prop, value) {
		object[prop] = value
		if(['loading', 'saving'].includes(prop)) {
			object.busy = object.loading || object.saving
		}
		return true
	}
}