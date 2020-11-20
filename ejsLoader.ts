// #!/usr/bin/env babel-node
// -*- coding: utf-8 -*-
/** @module ejsLoader */
'use strict'
/* !
    region header
    Copyright Torben Sickert (info["~at~"]torben.website) 16.12.2012

    License
    -------

    This library written by Torben Sickert stand under a creative commons
    naming 3.0 unported license.
    See https://creativecommons.org/licenses/by/3.0/deed.de
    endregion
*/
// region imports
import {
    BabelFileResult, transformSync as babelTransformSync
} from '@babel/core'
import babelMinifyPreset from 'babel-preset-minify'
/*
    NOTE: Would result in error: "TypeError:
    ../webOptimizer/unknown: Cannot read property
    'contextVariables' of undefined

    import transformWith from 'babel-plugin-transform-with'
*/
import Tools from 'clientnode'
import {EvaluationResult, Encoding, Mapping} from 'clientnode/type'
import ejs, {Options, TemplateFunction} from 'ejs'
import fileSystem from 'fs'
import {minify as minifyHTML} from 'html-minifier'
import {getOptions, getRemainingRequest} from 'loader-utils'
import path from 'path'

import configuration from './configurator'
import Helper from './helper'
import {Extensions} from './type'
// endregion
// region types
export type CompilerOptions = Options & {
    encoding:Encoding
    isString?:boolean
}
export type CompileFunction = (
    template:string,
    options?:Partial<CompilerOptions>,
    compileSteps?:number
) => TemplateFunction
export type LoaderConfiguration = Mapping<unknown> & {
    compiler:CompilerOptions
    compileSteps:number
    compress:{
        html:Record<string, unknown>
        javaScript:Record<string, unknown>
    }
    context:string
    extensions:Extensions
    locals?:Record<string, unknown>
    module:{
        aliases:Record<string, string>
        replacements:Record<string, string>
    }
}
// endregion
/**
 * Main transformation function.
 * @param this - Loader context.
 * @param source - Input string to transform.
 * @returns Transformed string.
 */
export default function(this:any, source:string):string {
    const givenOptions:LoaderConfiguration =
        Tools.convertSubstringInPlainObject(
            Tools.extend(
                true,
                {
                    compileSteps: 2,
                    compress: {
                        html: {},
                        javaScript: {}
                    },
                    context: './',
                    extensions: {
                        file: {
                            external: [],
                            internal: [
                                '.js', '.json',
                                '.css',
                                '.svg', '.png', '.jpg', '.gif', '.ico',
                                '.html',
                                '.eot', '.ttf', '.woff', '.woff2'
                            ]
                        },
                        module: []
                    },
                    module: {
                        aliases: {},
                        replacements: {}
                    }
                },
                'query' in this ? getOptions(this) || {} : {}
            ),
            /#%%%#/g,
            '!'
        ) as LoaderConfiguration
    const compile:CompileFunction = (
        template:string,
        options:Partial<CompilerOptions> = givenOptions.compiler,
        compileSteps = 2
    ):TemplateFunction => (locals:Record<string, unknown> = {}):string => {
        options = Tools.extend(true, {filename: template}, options)
        const require:Function = (
            request:string, nestedLocals:Record<string, unknown> = {}
        ):string => {
            const template:string = request.replace(/^(.+)\?[^?]+$/, '$1')
            const queryMatch:Array<string>|null = /^[^?]+\?(.+)$/.exec(request)
            if (queryMatch) {
                const evaluated:EvaluationResult = Tools.stringEvaluate(
                    queryMatch[1], {request, template, source, compile, locals}
                )
                if (evaluated.error)
                    console.warn(
                        'Error occurred during processing given query: ' +
                        evaluated.error
                    )
                else
                    Tools.extend(true, nestedLocals, evaluated.result)
            }
            let nestedOptions:CompilerOptions =
                Tools.copy(options) as CompilerOptions
            delete nestedOptions.client
            nestedOptions = Tools.extend(
                true,
                {encoding: configuration.encoding},
                nestedOptions,
                nestedLocals.options || {},
                options
            )
            if (nestedOptions.isString)
                return compile(template, nestedOptions)(nestedLocals)
            const templateFilePath:null|string = Helper.determineModuleFilePath(
                template,
                givenOptions.module.aliases,
                givenOptions.module.replacements,
                {file: givenOptions.extensions.file.internal},
                givenOptions.context,
                configuration.path.source.asset.base,
                configuration.path.ignore,
                configuration.module.directoryNames,
                configuration.package.main.fileNames,
                configuration.package.main.propertyNames,
                configuration.package.aliasPropertyNames,
                configuration.encoding
            )
            if (templateFilePath) {
                if ('addDependency' in this)
                    this.addDependency(templateFilePath)
                /*
                    NOTE: If there aren't any locals options or variables and
                    file doesn't seem to be an ejs template we simply load
                    included file content.
                */
                if (queryMatch || templateFilePath.endsWith('.ejs'))
                    return compile(templateFilePath, nestedOptions)(
                        nestedLocals
                    )
                return fileSystem.readFileSync(
                    templateFilePath, {encoding: nestedOptions.encoding}
                ) as unknown as string
            }
            throw new Error(
                `Given template file "${template}" couldn't be resolved.`
            )
        }
        const compressHTML:Function = (content:string):string =>
            givenOptions.compress.html ?
                minifyHTML(
                    content,
                    Tools.extend(
                        true,
                        {
                            caseSensitive: true,
                            collapseInlineTagWhitespace: true,
                            collapseWhitespace: true,
                            conservativeCollapse: true,
                            minifyCSS: true,
                            minifyJS: true,
                            processScripts: [
                                'text/ng-template',
                                'text/x-handlebars-template'
                            ],
                            removeAttributeQuotes: true,
                            removeComments: true,
                            removeRedundantAttributes: true,
                            removeScriptTypeAttributes: true,
                            removeStyleLinkTypeAttributes: true,
                            sortAttributes: true,
                            sortClassName: true,
                            /*
                                NOTE: Avoids whitespace around placeholder in
                                tags.
                            */
                            trimCustomFragments: true,
                            useShortDoctype: true
                        },
                        givenOptions.compress.html
                    )
                ) :
                content
        let remainingSteps:number = compileSteps
        let result:string|TemplateFunction = template
        const isString:boolean = Boolean(options.isString)
        delete options.isString
        while (remainingSteps > 0) {
            if (typeof result === 'string') {
                const filePath:string|undefined = isString ?
                    options.filename :
                    result
                if (filePath && path.extname(filePath) === '.js')
                    result = eval('require')(filePath)
                else {
                    if (!isString) {
                        let encoding:Encoding = configuration.encoding
                        if (typeof options.encoding === 'string')
                            encoding = options.encoding
                        result = fileSystem.readFileSync(result, {encoding})
                    }
                    if (remainingSteps === 1)
                        result = compressHTML(result)
                    result = ejs.compile(
                        result as string, options
                    ) as TemplateFunction
                }
            } else
                result = compressHTML(result(Tools.extend(
                    true,
                    {configuration, Helper, include: require, require, Tools},
                    locals
                )))
            remainingSteps -= 1
        }
        if (compileSteps % 2) {
            let code = `module.exports = ${result.toString()};`
            const processed:BabelFileResult|null = babelTransformSync(
                code,
                {
                    ast: false,
                    babelrc: false,
                    comments: !givenOptions.compress.javaScript,
                    compact: Boolean(givenOptions.compress.javaScript),
                    filename: options.filename || 'unknown',
                    minified: Boolean(givenOptions.compress.javaScript),
                    /*
                        NOTE: See corresponding import statement.
                    plugins: [transformWith],
                    */
                    presets: givenOptions.compress.javaScript ?
                        [[
                            babelMinifyPreset, givenOptions.compress.javaScript
                        ]] :
                        [],
                    sourceMaps: false,
                    sourceType: 'script'
                }
            )
            if (typeof processed?.code === 'string')
                code = processed.code
            return `'use strict';\n${code}`
        }
        if (typeof result === 'string') {
            result = result
                .replace(
                    new RegExp(
                        `<script +processing-workaround *` +
                        `(?:= *(?:" *"|' *') *)?>([\\s\\S]*?)</ *script *>`,
                        'ig'
                    ),
                    '$1'
                )
                .replace(
                    new RegExp(
                        `<script +processing(-+)-workaround *` +
                        `(?:= *(?:" *"|' *') *)?>([\\s\\S]*?)</ *script *>`,
                        'ig'
                    ),
                    '<script processing$1workaround>$2</script>'
                )
            return result
        }
        return ''
    }
    return compile(
        source,
        {
            client: Boolean(givenOptions.compileSteps % 2),
            compileDebug: this.debug || false,
            debug: this.debug || false,
            filename:
                'query' in this ?
                    getRemainingRequest(this).replace(/^!/, '') :
                    this.resourcePath || 'unknown',
            isString: true
        },
        givenOptions.compileSteps
    )(givenOptions.locals || {})
}
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
