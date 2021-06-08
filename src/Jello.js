export default class Jello {

	static config(config) {
		this.config = config
	}

	static defaultClient() {
		return this.client(this.config.client.default)
	}

	static client(key = null) {
		if(!key) {
			return this.config.clients[this.config.clients.default]
		} else if(typeof key == 'string') {
			return this.config.clients[key]
		} else if(typeof key == 'object') {
			return key
		} else {
			console.error('No Jello client specified for key:', key)
		}
	}

}