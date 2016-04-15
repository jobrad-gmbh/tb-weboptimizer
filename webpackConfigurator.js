#!/usr/bin/env node
// -*- coding: utf-8 -*-
'use strict'
// region imports
import extend from 'extend'
import * as fileSystem from 'fs'
import * as dom from 'jsdom'
import path from 'path'
fileSystem.removeDirectoryRecursivelySync = module.require('rimraf').sync
// NOTE: Only needed for debugging this file.
try {
    module.require('source-map-support/register')
} catch (error) {}
import webpack from 'webpack'
const plugins = module.require('webpack-load-plugins')()
plugins.HTML = plugins.html
plugins.ExtractText = plugins.extractText
import {RawSource as WebpackRawSource} from 'webpack-sources'
plugins.Offline = module.require('offline-plugin')

import configuration from './configurator.compiled'
import helper from './helper.compiled'

// Monkey-Patch html loader to retrieve html loader options since the
// "webpack-html-plugin" doesn't preserve the original loader interface.
const moduleBackup = require('html-loader')
require.cache[require.resolve('html-loader')].exports = function() {
    extend(true, this.options, module, this.options)
    return moduleBackup.apply(this, arguments)
}
// endregion
// region initialisation
// / region pre processing
// // region plugins
configuration.plugins = []
if (!configuration.library)
    for (let htmlOptions of configuration.files.html)
        configuration.plugins.push(new plugins.HTML(htmlOptions))
if (configuration.offline) {
    if (!configuration.offline.excludes)
        configuration.offline.excludes = []
    if (configuration.inPlace.cascadingStyleSheet)
        configuration.offline.excludes.push(
            `${configuration.path.asset.cascadingStyleSheet}*.css?` +
            `${configuration.hashAlgorithm}=*`)
    if (configuration.inPlace.javaScript)
        configuration.offline.excludes.push(
            `${configuration.path.asset.javaScript}*.js?` +
            `${configuration.hashAlgorithm}=*`)
    configuration.plugins.push(new plugins.Offline(configuration.offline))
}
if ((
    !configuration.library ||
    configuration.givenCommandLineArguments[2] === 'test'
) && configuration.openBrowser)
    configuration.plugins.push(new plugins.openBrowser(
        configuration.openBrowser))
// // endregion
// // region modules/assets
extend(configuration.moduleAliases, configuration.additionalModuleAliases)
let injects
let fallbackModuleDirectoryPaths = []
if (configuration.givenCommandLineArguments[2] === 'test') {
    [injects, fallbackModuleDirectoryPaths] = helper.determineModuleLocations()
    injects = {internal: injects, external: []}
    let favicon = configuration.path.asset.source +
        `${configuration.path.asset.image}favicon.ico`
    try {
        if (!fileSystem.statSync(favicon).isFile())
            favicon = null
    } catch (error) {
        favicon = null
    }
} else {
    configuration.plugins.push(new plugins.ExtractText(
        configuration.files.cascadingStyleSheet, {allChunks: true}))
    // Optimizes webpack output and provides an offline manifest
    if (configuration.optimizer.uglifyJS)
        configuration.plugins.push(new webpack.optimize.UglifyJsPlugin(
            configuration.optimizer.uglifyJS))
    // // region in-place configured assets in the main html file
    if (!(configuration.library || process.argv[1].endsWith(
        '/webpack-dev-server'
    )))
        configuration.plugins.push({apply: compiler => {
            compiler.plugin('emit', (compilation, callback) => {
                if (
                    configuration.inPlace.cascadingStyleSheet ||
                    configuration.inPlace.javaScript
                )
                    dom.env(compilation.assets[configuration.files.html[
                        0
                    ].filename].source(), (error, window) => {
                        if (configuration.inPlace.cascadingStyleSheet) {
                            const urlPrefix = configuration.files
                                .cascadingStyleSheet.replace(
                                    '[contenthash]', '')
                            const domNode = window.document.querySelector(
                                `link[href^="${urlPrefix}"]`)
                            if (domNode) {
                                let asset
                                for (asset in compilation.assets)
                                    if (asset.startsWith(urlPrefix))
                                        break
                                const inPlaceDomNode =
                                    window.document.createElement('style')
                                inPlaceDomNode.textContent =
                                    compilation.assets[asset].source()
                                domNode.parentNode.insertBefore(
                                    inPlaceDomNode, domNode)
                                domNode.parentNode.removeChild(domNode)
                                /*
                                    NOTE: This doesn't prevent webpack from
                                    creating this file if present in another
                                    chunk so removing it (and a potential
                                    source map file) later in the "done" hook.
                                */
                                delete compilation.assets[asset]
                            } else
                                console.warn(
                                    'No referenced cascading style sheet ' +
                                    'file in resulting markup found with ' +
                                    `selector: link[href^="${urlPrefix}"]`)
                        }
                        if (configuration.inPlace.javaScript) {
                            const urlPrefix = configuration.files.javaScript
                                .replace('[hash]', '')
                            const domNode = window.document.querySelector(
                                `script[src^="${urlPrefix}"]`)
                            if (domNode) {
                                let asset
                                for (asset in compilation.assets)
                                    if (asset.startsWith(urlPrefix))
                                        break
                                domNode.textContent = compilation.assets[
                                    asset
                                ].source()
                                domNode.removeAttribute('src')
                                /*
                                    NOTE: This doesn't prevent webpack from
                                    creating this file if present in another
                                    chunk so removing it (and a potential
                                    source map file) later in the "done" hook.
                                */
                                delete compilation.assets[asset]
                            } else
                                console.warn(
                                    'No referenced javaScript file in ' +
                                    'resulting markup found with selector: ' +
                                    `script[src^="${urlPrefix}"]`)
                        }
                        compilation.assets[configuration.files.html[
                            0
                        ].filename] = new WebpackRawSource(
                            compilation.assets[configuration.files.html[
                                0
                            ].filename].source().replace(
                                /^(\s*<!doctype[^>]+?>\s*)[\s\S]*$/i, '$1'
                            ) + window.document.documentElement.outerHTML)
                        callback()
                    })
            })
            compiler.plugin('after-emit', (compilation, callback) => {
                if (configuration.inPlace.cascadingStyleSheet)
                    fileSystem.removeDirectoryRecursivelySync(path.join(
                        configuration.path.asset.target,
                        configuration.path.asset.cascadingStyleSheet
                    ), {glob: false})
                if (configuration.inPlace.javaScript) {
                    const assetFilePath = path.join(
                        configuration.path.asset.target,
                        configuration.files.javaScript.replace(
                            `?${configuration.hashAlgorithm}=[hash]`, ''))
                    for (let filePath of [
                        assetFilePath, `${assetFilePath}.map`
                    ])
                        try {
                            fileSystem.unlinkSync(filePath)
                        } catch (error) {}
                    let javaScriptPath = path.join(
                        configuration.path.asset.target,
                        configuration.path.asset.javaScript)
                    if (fileSystem.readdirSync(javaScriptPath).length === 0)
                        fileSystem.rmdirSync(javaScriptPath)
                }
                callback()
            })
        }})
    // // endregion
    injects = helper.determineInjects()
    let javaScriptNeeded = false
    if (global.Array.isArray(injects.internal))
        for (let filePath of injects.internal) {
            let type = helper.determineAssetType(filePath)
            if (configuration.build[type] && configuration.build[
                type
            ].outputExtension === 'js') {
                javaScriptNeeded = true
                break
            }
        }
    else
        global.Object.keys(injects.internal).forEach(moduleName => {
            let type = helper.determineAssetType(injects.internal[moduleName])
            if (configuration.build[type] && configuration.build[
                type
            ].outputExtension === 'js') {
                javaScriptNeeded = true
                return false
            }
        })
    if (!javaScriptNeeded)
        configuration.files.javaScript = path.join(
            configuration.path.asset.javaScript, '.__dummy__.compiled.js')
    if (configuration.library)
        /*
            We only want to process modules from local context in library mode,
            since a concrete project using this library should combine all
            assets for optimal results.
        */
        injects.external = (context, request, callback) => {
            if (global.Array.isArray(
                injects.internal
            ) && injects.internal.indexOf(request) !== -1)
                return callback(null, `umd ${request}`)
            if (helper.isObject(injects.internal)) {
                let isInternal = false
                for (let chunkName in injects.internal)
                    if (injects.internal[chunkName] === request) {
                        isInternal = true
                        break
                    }
                if (!isInternal)
                    return callback(null, `umd ${request}`)
            }
            callback()
        }
}
// // endregion
// / endregion
// / region loader
let imageLoader = 'url?' + global.JSON.stringify(
    configuration.optimizer.image.file)
if (configuration.optimizer.image.content)
    imageLoader += '!image?' + global.JSON.stringify(
        configuration.optimizer.image.content)
const loader = {
    preprocessor: {
        less: `less?${global.JSON.stringify(configuration.preprocessor.less)}`,
        sass: `sass?${global.JSON.stringify(configuration.preprocessor.sass)}`,
        scss: `sass?${global.JSON.stringify(configuration.preprocessor.scss)}`,
        babel: 'babel?' + global.JSON.stringify(
            configuration.preprocessor.modernJavaScript),
        coffee: 'coffee',
        jade: `jade?${global.JSON.stringify(configuration.preprocessor.jade)}`,
        literateCoffee: 'coffee?literate'
    },
    html: `html?${global.JSON.stringify(configuration.html)}`,
    cascadingStyleSheet: plugins.extractText.extract(
        `css?${global.JSON.stringify(configuration.cascadingStyleSheet)}`),
    postprocessor: {
        image: imageLoader,
        font: {
            eot: 'url?' +
                global.JSON.stringify(configuration.optimizer.font.eot),
            woff: 'url?' +
                global.JSON.stringify(configuration.optimizer.font.woff),
            ttf: 'url?' +
                global.JSON.stringify(configuration.optimizer.font.ttf),
            svg: 'url?' +
                global.JSON.stringify(configuration.optimizer.font.svg)
        },
        data: `url?${global.JSON.stringify(configuration.optimizer.default)}`
    }
}
// / endregion
// endregion
// region configuration
export default {
    context: configuration.path.context,
    debug: configuration.debug,
    devtool: configuration.developmentTool,
    devserver: configuration.developmentServer,
    // region input
    resolveLoader: configuration.loader,
    resolve: {
        root: [configuration.path.asset.source],
        fallback: fallbackModuleDirectoryPaths,
        extensions: configuration.knownExtensions,
        alias: configuration.moduleAliases
    },
    entry: injects.internal, externals: injects.external,
    // endregion
    // region output
    output: {
        path: configuration.path.asset.target,
        publicPath: configuration.path.asset.publicTarget,
        filename: configuration.files.javaScript,
        pathinfo: configuration.debug,
        hashFunction: configuration.hashAlgorithm,
        libraryTarget: 'umd',
        umdNamedDefine: configuration.name,
        library: configuration.name
    },
    // endregion
    module: {
        preLoaders: [
            // Convert to native web types.
            // region style
            {
                test: /\.less$/,
                loader: `${loader.cascadingStyleSheet}!` +
                    loader.preprocessor.less,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.less)
            },
            {
                test: /\.sass$/,
                loader: `${loader.cascadingStyleSheet}!` +
                    loader.preprocessor.sass,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.sass)
            },
            {
                test: /\.scss$/,
                loader: `${loader.cascadingStyleSheet}!` +
                    loader.preprocessor.scss,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.scss)
            },
            // endregion
            // region script
            {
                test: /\.js$/,
                loader: loader.preprocessor.babel,
                include: [path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.javaScript
                )].concat((configuration.givenCommandLineArguments[
                    2
                ] === 'test') ? root : []),
                exclude: filePath => {
                    if (configuration.givenCommandLineArguments[
                        2
                    ] === 'test')
                        for (let pathToIgnore of configuration.path.ignore)
                            if (filePath.startsWith(path.resolve(
                                pathToIgnore
                            )))
                                return true
                    return false
                }
            },
            {
                test: /\.coffee$/,
                loader: loader.preprocessor.coffee,
                include: [path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.coffeeScript
                )].concat((configuration.givenCommandLineArguments[
                    2
                ] === 'test') ? root : [])
            },
            {
                test: /\.(?:coffee\.md|litcoffee)$/,
                loader: loader.preprocessor.literateCoffee,
                include: [path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.coffeeScript
                )].concat((configuration.givenCommandLineArguments[
                    2
                ] === 'test') ? root : [])
            },
            // endregion
            // region html (templates)
            {
                test: /\.jade$/,
                loader:
                    `file?name=${configuration.path.asset.template}` +
                    `[name].html?${configuration.hashAlgorithm}=[hash]!` +
                    `extract!${loader.html}!${loader.preprocessor.jade}`,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.template),
                exclude: configuration.files.html.map(request => {
                    return request.template.substring(
                        request.template.lastIndexOf('!') + 1)
                })
            }
            // endregion
        ],
        loaders: [
            // Loads dependencies.
            // region html (templates)
            {
                test: /\.html$/,
                loader:
                    `file?name=${configuration.path.asset.template}` +
                    `[name].[ext]?${configuration.hashAlgorithm}=[hash]!` +
                    `extract!${loader.html}`,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.template),
                exclude: configuration.files.html.map(request => {
                    return request.template.substring(
                        request.template.lastIndexOf('!') + 1)
                })
            },
            // endregion
            // region cascadingStyleSheet
            {test: /\.css$/, loader: loader.cascadingStyleSheet}
            // endregion
        ],
        postLoaders: [
            // Optimize loaded assets.
            // region font
            {
                test: /\.eot(?:\?v=\d+\.\d+\.\d+)?$/,
                loader: loader.postprocessor.font.eot
            },
            {test: /\.woff2?$/, loader: loader.postprocessor.font.woff},
            {
                test: /\.ttf(?:\?v=\d+\.\d+\.\d+)?$/,
                loader: loader.postprocessor.font.ttf
            },
            {
                test: /\.svg(?:\?v=\d+\.\d+\.\d+)?$/,
                loader: loader.postprocessor.font.svg
            },
            // endregion
            // region image
            {
                test: /\.(?:png|jpg|ico|gif)$/,
                loader: loader.postprocessor.image
            },
            // endregion
            // region data
            {
                test: /.+/,
                loader: loader.postprocessor.data,
                include: path.join(
                    configuration.path.asset.source,
                    configuration.path.asset.data)
            }
            // endregion
        ]
    },
    plugins: configuration.plugins,
    // Let the "html-loader" access full html minifier processing
    // configuration.
    html: configuration.optimizer.htmlMinifier,
    jade: configuration.preprocessor.jade
}
// endregion
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
