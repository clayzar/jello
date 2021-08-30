const { merge } = require('lodash')

module.exports = function getOptions() {
	let options = {};
	for(const someOptions of arguments) {
		options = merge(options, someOptions)
	}
	return options
}