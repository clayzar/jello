export default function objectToFormData(object, data, namespace) {

	data = data || new FormData();
	
	for(var property in object) {
		if(object.hasOwnProperty(property)) {
			
			const key = namespace ? `${namespace}[${property}]` : property

			if(typeof object[property] === 'object' && !(object[property] instanceof File)) {
				// if the property is an object, but not a File,
				// use recursivity.
				objectToFormData(object[property], data, property);
			} else {
				// if it's a string or a File object
				data.append(key, object[property]);
			}
		}
	}
	
	return data;
}