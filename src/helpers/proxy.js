const attributeProxyHander = {
	get(object, prop, proxy) {
		// console.log('get:', prop, object, proxy);
		if(['then', 'catch', 'finally'].includes(prop)) {

			return (callback) => {
				if(object._promise) {
					object._promise = object._promise[prop](callback)
					return proxy					
				} else {
					if(prop !== 'catch') {
						// console.log('calling callback:', object, proxy);
						callback(object)
					}
					return proxy
				}
			}
			
		}

		if(object.hasOwnProperty(prop)) {
			// console.log('get: hasOwnProperty', prop,  object, proxy);
			return object[prop]
		}
		if(object._attributes.hasOwnProperty(prop)) {
			// console.log('get: has _attribute', prop, object, proxy);
			return object._attributes[prop]
		}

		return Reflect.get(...arguments)
	},
	set(object, prop, value, proxy) {
		if(object.hasOwnProperty(prop)) {
			object[prop] = value
		} else {
			object._attributes[prop] = value
		}

		return true
	},
	has: function (object, prop) {
		return object._attributes.hasOwnProperty(prop)
	},				
	deleteProperty: function (object, prop) {
		if(prop in object._attributes) {
			return delete object[prop]
		}
	},
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

const modelProcessStateProxyHandler = {
	set(object, prop, value) {
		object[prop] = value
		if(['loading', 'saving'].includes(prop)) {
			object.busy = object.loading || object.saving
		}
		return true
	}
}

export {
	attributeProxyHander,
	modelProcessStateProxyHandler
}