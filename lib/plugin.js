'use strict'

const fs = require('graceful-fs')
const path = require('path')
const helper = require('./helper')

const log = require('./logger').create('plugin')

const IGNORED_PACKAGES = ['karma-cli', 'karma-runner.github.com']

function resolve (plugins, emitter) {
  const modules = []

  function requirePlugin (name) {
    log.debug(`Loading plugin ${name}.`)
    try {
      modules.push(require(name))
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(name)) {
        log.error(`Cannot find plugin "${name}".\n  Did you forget to install it?\n  npm install ${name} --save-dev`)
      } else {
        log.error(`Error during loading "${name}" plugin:\n  ${e.message}`)
      }
      emitter.emit('load_error', 'plug_in', name)
    }
  }

  function listPluginsFromPnp () {
    log.debug('Loading plugins from pnp')
    const pnp = require('pnpapi')
    const top = pnp.getPackageInformation(pnp.topLevel)
    return top.packageDependencies.keys()
  }

  function listPluginsInDir () {
    const base = path.join(__dirname, '/../..')
    const pluginDirectory = path.normalize(base)
    log.debug(`Loading plugins in ${pluginDirectory}`)
    return fs.readdirSync(pluginDirectory)
  }

  const allPlugins = process.versions.pnp ? listPluginsFromPnp() : listPluginsInDir()

  plugins.forEach(function (plugin) {
    if (helper.isString(plugin)) {
      if (!plugin.includes('*')) {
        requirePlugin(plugin)
        return
      }

      const regexp = new RegExp(`^${plugin.replace('*', '.*')}`)
      log.debug(`Filtering plugins matching: ${plugin}`)
      for (const pluginName of allPlugins) {
        if (IGNORED_PACKAGES.includes(pluginName)) continue
        if (!regexp.test(pluginName)) continue
        requirePlugin(pluginName)
      }
    } else if (helper.isObject(plugin)) {
      log.debug(`Loading inlined plugin (defining ${Object.keys(plugin).join(', ')}).`)
      modules.push(plugin)
    } else {
      log.error(`Invalid plugin ${plugin}`)
      emitter.emit('load_error', 'plug_in', plugin)
    }
  })

  return modules
}

exports.resolve = resolve
