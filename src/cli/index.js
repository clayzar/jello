#!/usr/bin/env node
const path = require('path')

const { config } = require('./../Jello');
const projectConfig = require(path.resolve('./jello.config.cli.js'))
config(projectConfig)

const alias = config().packageAliasedAs

const args = process.argv.splice(2)
const [ command, ...options ] = args

const commands = {};
require("fs").readdirSync(path.resolve(`${__dirname}/commands`)).forEach(function(file) {
	const command = require(path.resolve(`${__dirname}/commands/${file}`));
	commands[command.command] = command
});

if(command in commands) {
	commands[command].handle(options)
} else {
	console.error(`Command does not exist: "${command}"`)
}