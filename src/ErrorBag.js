module.exports = class Errors {
	constructor() {
		this.errors = {};
	}

	has(field) {
		return this.errors.hasOwnProperty(field);
	}

	any() {
		return Object.keys(this.errors).length;
	}

	get(field) {
		if(this.errors[field]) {
			return this.errors[field];
		}
	}

	first(field) {
		if(this.errors[field]) {
			return this.errors[field][0];
		}		
	}

	record(errors) {
		this.errors = errors;
	}

	clear(field) {
		if(field) {
			delete this.errors[field];

			return;
		}

		this.errors = {};
	}

	all() {
		var errors = [];
		Object.values(this.errors).forEach(fieldErrors => errors = errors.concat(fieldErrors));
		return errors;
	}
}