import defaults from './config/defaults'

import getOptions from './helpers/getOptions'

let configState = {}

let hasAppliedConfig = false

export function config(config = null) {
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

export function defaultClient() {
	return getClient(configState.clients.default)
}

export function getClient(key = null) {
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

export default {
	config,
	defaultClient,
	getClient
}