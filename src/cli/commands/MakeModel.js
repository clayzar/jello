module.exports.command = 'make:model';

const path = require('path')
const fs = require('fs')

const jello = require('./../../Jello')
const config = jello.config()
const modelDirectoryPath = config.models.path;
const packageAlias = config.packageAliasedAs;

module.exports.handle = function(options) {
	const modelName = options[0]
	const modelFilePath = `${modelDirectoryPath}/${modelName}.js`

	try {
		if (fs.existsSync(modelFilePath)) {
			return console.error('That model already exists')
		}		
	} catch(err) {
		console.error(err)
	}

	try {
		let data = fs.readFileSync(path.resolve(`node_modules/${packageAlias}/src/stubs/Model.stub`), 'utf8')

		data = data.replace(/#PKG_ALIAS/g, packageAlias)
		data = data.replace(/#MODEL/g, modelName)

		fs.writeFileSync(modelFilePath, data)
		console.log('Model created sucessfully')
	} catch (err) {
		return console.error(err)
	}


}