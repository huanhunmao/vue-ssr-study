const chalk = require('chalk')

const warn = msg => console.error(chalk.red(`[vue-ssr-webpack-plugin] ${msg}\n`))
const tip = msg => console.log(chalk.yellow(`[vue-ssr-webpack-plugin] ${msg}\n`))

class VueSSRPlugin {
  constructor (options = {}) {
    this.options = options
  }

  apply (compiler) {
    if (compiler.options.target !== 'node') {
      warn(
        'webpack config `target` should be "node".'
      )
    }

    if (compiler.options.output && compiler.options.output.libraryTarget !== 'commonjs2') {
      warn(
        'webpack config `output.libraryTarget` should be "commonjs2".'
      )
    }

    if (!compiler.options.externals) {
      tip(
        'It is recommended to externalize dependencies for better ssr performance.\n' +
        `See ${chalk.gray('https://github.com/vuejs/vue/tree/dev/packages/vue-server-renderer#externals')} ` +
        'for more details.'
      )
    }

    compiler.plugin('emit', (compilation, cb) => {
      const stats = compilation.getStats().toJson()

      const entryName = this.options.entry || 'main'
      let entry = stats.assetsByChunkName[entryName]

      if (Array.isArray(entry)) {
        entry = entry.filter(file => file.match(/\.js$/))[0]
      }

      if (!entry || typeof entry !== 'string') {
        throw new Error(
          `Entry "${entryName}" not found. Did you specify the correct entry option?`
        )
      }

      const bundle = {
        entry,
        files: {},
        maps: {}
      }

      stats.assets.forEach(asset => {
        if (asset.name.match(/\.js$/)) {
          bundle.files[asset.name] = compilation.assets[asset.name].source()
          delete compilation.assets[asset.name]
        } else if (asset.name.match(/\.js\.map$/)) {
          bundle.maps[asset.name.replace(/\.map$/, '')] = JSON.parse(compilation.assets[asset.name].source())
          delete compilation.assets[asset.name]
        }
      })

      const json = JSON.stringify(bundle, null, 2)
      const filename = this.options.filename || 'vue-ssr-bundle.json'

      compilation.assets[filename] = {
        source: () => json,
        size: () => json.length
      }

      cb()
    })
  }
}

module.exports = VueSSRPlugin
