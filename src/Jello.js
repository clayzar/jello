const path = require('path')
const defaults = require('./config/defaults')

const getOptions = require('./helpers/getOptions')

let configState = {
	models: {
		wrapped: false,
		saved: {
			merge: false
		},
		path: path.resolve('./src/models')
	},
	collections: {
		paginate: 'auto'
	},
	packageAliasedAs: 'jello.js'
}

let hasAppliedConfig = false

let loadedConfigFile = false

// function init(path = null) {
// 	if(!loadedConfigFile) {
// 		loadedConfigFile = true
// 		let userConfig = null
// 		try {
// 			userConfig = require('./../../../jello.config.js')
// 		} catch {
// 			userConfig = require(path)
// 		}
// 		config(userConfig)
// 	}
// }

function config(config = null) {

	if(config == null) {
		return getOptions(configState, ...arguments)
	}

	let configs = [configState, defaults, config]

	if(hasAppliedConfig) {
		configs = [{ignoreDuplicateConfig: configState.ignoreDuplicateConfig}]
	}

	configState = getOptions(...configs)

	if(hasAppliedConfig && !configState.ignoreDuplicateConfig) {
		console.warn('Jello config has been set more than once. This may indicate an issue with your code logic. To silence this warning, set ignoreDuplicateConfig: true in your call to Jello.config')
	}

	hasAppliedConfig = true
}

function defaultClient() {
	return getClient(configState.clients.default)
}

function getClient(key = null) {
	if(!key) {
		if(configState.clients.default) {
			if(typeof configState.clients.default == 'string') {
				return configState.clients[configState.clients.default]
			} else {
				configState.clients.default
			}
		} else {
			throw('Jello: No client specified and default client not set')
		}
	} else if(typeof key == 'string') {
		return configState.clients[key]
	} else if(typeof key == 'function') { 
		// should be an axios instance, and axios client instances are wrapped with a function
		return key
	} else {
		console.error('No Jello client specified for key:', key)
	}
}

module.exports = {
	config,
	defaultClient,
	getClient
}

module.exports.config = config
module.exports.defaultClient = defaultClient
module.exports.getClient = getClient