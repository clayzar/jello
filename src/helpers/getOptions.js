import { merge } from 'lodash'

export default function getOptions() {
	let options = {};
	for(const someOptions of arguments) {
		options = _.merge(options, someOptions)
	}
	return options
}