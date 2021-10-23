#!/usr/bin/env node
const path = require('path')

const { config } = require('./../Jello');
const projectConfig = require(path.resolve('./jello.config.js'))
config(projectConfig)

const alias = config().packageAliasedAs

const args = process.argv.splice(2)
const [ command, ...options ] = args

const MakeModel = require('./commands/MakeModel')

if(command == 'make:model') {
	return MakeModel.handle(options)
}