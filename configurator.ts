#!/usr/bin/env node
// -*- coding: utf-8 -*-
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
import Tools, {PlainObject} from 'clientnode'
import fileSystem from 'fs'
import path from 'path'

import Helper from './helper.compiled'
// NOTE: "{configuration as metaConfiguration}" would result in a read only
// variable named "metaConfiguration".
import {configuration as givenMetaConfiguration} from './package'
import {
    DefaultConfiguration,
    /* eslint-disable no-unused-vars */
    HTMLConfiguration,
    /* eslint-enable no-unused-vars */
    MetaConfiguration,
    ResolvedConfiguration
} from './type'
const metaConfiguration:MetaConfiguration = givenMetaConfiguration
/*
    To assume to go two folder up from this file until there is no
    "node_modules" parent folder is usually resilient again dealing with
    projects where current working directory isn't the projects directory and
    this library is located as a nested dependency.
*/
metaConfiguration.default.path.context = __dirname
metaConfiguration.default.contextType = 'main'
while (true) {
    metaConfiguration.default.path.context = path.resolve(
        metaConfiguration.default.path.context, '../../')
    if (path.basename(path.dirname(
        metaConfiguration.default.path.context
    )) !== 'node_modules')
        break
}
if (
    path.basename(path.dirname(process.cwd())) === 'node_modules' ||
    path.basename(path.dirname(process.cwd())) === '.staging' &&
    path.basename(path.dirname(path.dirname(process.cwd()))) === 'node_modules'
) {
    /*
        NOTE: If we are dealing was a dependency project use current directory
        as context.
    */
    metaConfiguration.default.path.context = process.cwd()
    metaConfiguration.default.contextType = 'dependency'
} else
    /*
        NOTE: If the current working directory references this file via a
        linked "node_modules" folder using current working directory as context
        is a better assumption than two folders up the hierarchy.
    */
    try {
        if (
            fileSystem.lstatSync(path.join(process.cwd(), 'node_modules'))
                .isSymbolicLink()
        )
            metaConfiguration.default.path.context = process.cwd()
    } catch (error) {
        // continue regardless of error
    }
let specificConfiguration:PlainObject
try {
    /* eslint-disable no-eval */
    specificConfiguration = eval('require')(path.join(
        metaConfiguration.default.path.context, 'package'))
    /* eslint-enable no-eval */
} catch (error) {
    specificConfiguration = {name: 'mockup'}
    metaConfiguration.default.path.context = process.cwd()
}
const name:string = specificConfiguration.name
specificConfiguration = specificConfiguration.webOptimizer || {}
specificConfiguration.name = name
// endregion
// region determine debug mode
// NOTE: Given node command line arguments results in "npm_config_*"
// environment variables.
let debug:boolean = metaConfiguration.default.debug
if (typeof specificConfiguration.debug === 'boolean')
    debug = specificConfiguration.debug
else if (
    process.env.npm_config_dev === 'true' ||
    ['debug', 'dev', 'development'].includes(process.env.NODE_ENV)
)
    debug = true
if (debug)
    process.env.NODE_ENV = 'development'
// endregion
// region loading default configuration
metaConfiguration.default.path.context += '/'
// Merges final default configuration object depending on given target
// environment.
const libraryConfiguration:PlainObject = metaConfiguration.library
let configuration:DefaultConfiguration
if (debug)
    configuration = Tools.extend(
        true,
        Tools.modifyObject(metaConfiguration.default, metaConfiguration.debug),
        metaConfiguration.debug
    )
else
    configuration = metaConfiguration.default
configuration.debug = debug
if (typeof configuration.library === 'object')
    Tools.extend(
        true,
        Tools.modifyObject(libraryConfiguration, configuration.library),
        configuration.library
    )
if (
    'library' in specificConfiguration &&
    specificConfiguration.library === true ||
    (
        'library' in specificConfiguration &&
        specificConfiguration.library === undefined ||
        !('library' in specificConfiguration)
    ) &&
    configuration.library
)
    configuration = Tools.extend(
        true, Tools.modifyObject(configuration, libraryConfiguration),
        libraryConfiguration
    )
// endregion
// region merging and evaluating task specific and dynamic configurations
// / region load additional dynamically given configuration
let count = 0
let filePath:null|string = null
while (true) {
    const newFilePath:string = configuration.path.context +
        `.dynamicConfiguration-${count}.json`
    if (!Tools.isFileSync(newFilePath))
        break
    filePath = newFilePath
    count += 1
}
let runtimeInformation:PlainObject = {givenCommandLineArguments: process.argv}
if (filePath) {
    runtimeInformation = JSON.parse(fileSystem.readFileSync(
        filePath, {encoding: configuration.encoding}
    ))
    fileSystem.unlink(filePath, (error:Error|null):void => {
        if (error)
            throw error
    })
}
// // region task specific configuration
// /// region apply task type specific configuration
const taskTypes:Array<string> = [
    'build', 'debug', 'document', 'serve', 'test', 'test:browser']
if (runtimeInformation.givenCommandLineArguments.length > 2)
    for (const type:string of taskTypes)
        if (
            runtimeInformation.givenCommandLineArguments[2] === type ||
            debug &&
            type == 'debug'
        )
            for (const configurationTarget:PlainObject of [
                configuration, specificConfiguration
            ])
                if (typeof configurationTarget[type] === 'object')
                    Tools.extend(
                        true,
                        Tools.modifyObject(
                            configurationTarget, configurationTarget[type]),
                        configurationTarget[type]
                    )
// /// endregion
// /// region clear task type specific configurations
for (const type:string of taskTypes)
    for (const configurationTarget:PlainObject of [
        configuration, specificConfiguration
    ])
        if (
            Object.prototype.hasOwnProperty.call(configurationTarget, type) &&
            typeof configurationTarget[type] === 'object'
        )
            delete configurationTarget[type]
// /// endregion
// // endregion
// / endregion
Tools.extend(
    true,
    Tools.modifyObject(
        Tools.modifyObject(configuration, specificConfiguration),
        runtimeInformation),
    specificConfiguration,
    runtimeInformation
)
let result:null|PlainObject = null
if (runtimeInformation.givenCommandLineArguments.length > 3)
    result = Tools.stringParseEncodedObject(
        runtimeInformation.givenCommandLineArguments[runtimeInformation
            .givenCommandLineArguments.length - 1],
        configuration, 'configuration')
if (typeof result === 'object' && result !== null) {
    if (Object.prototype.hasOwnProperty.call(result, '__reference__')) {
        const referenceNames:Array<string> = [].concat(result.__reference__)
        delete result.__reference__
        for (const name:string of referenceNames)
            Tools.extend(true, result, configuration[name])
    }
    Tools.extend(true, Tools.modifyObject(configuration, result), result)
}
// Removing comments (default key name to delete is "#").
configuration = Tools.removeKeys(configuration)
// endregion
// / region determine existing pre compiled dll manifests file paths
configuration.dllManifestFilePaths = []
if (Tools.isDirectorySync(configuration.path.target.base))
    for (const fileName:string of fileSystem.readdirSync(
        configuration.path.target.base
    ))
        if (/^.*\.dll-manifest\.json$/.exec(fileName))
            configuration.dllManifestFilePaths.push(path.resolve(
                configuration.path.target.base, fileName))
// / endregion
// / region build absolute paths
configuration.path.base = path.resolve(
    configuration.path.context, configuration.path.base)
for (const key:string in configuration.path)
    if (
        Object.prototype.hasOwnProperty.call(configuration.path, key) &&
        key !== 'base' &&
        typeof configuration.path[key] === 'string'
    )
        configuration.path[key] = path.resolve(
            configuration.path.base, configuration.path[key]
        ) + '/'
    else if (
        key !== 'configuration' &&
        Tools.isPlainObject(configuration.path[key])
    ) {
        configuration.path[key].base = path.resolve(
            configuration.path.base, configuration.path[key].base)
        for (const subKey:string in configuration.path[key])
            if (
                Object.prototype.hasOwnProperty.call(
                    configuration.path[key], subKey) &&
                !['base', 'public'].includes(subKey) &&
                typeof configuration.path[key][subKey] === 'string'
            )
                configuration.path[key][subKey] = path.resolve(
                    configuration.path[key].base,
                    configuration.path[key][subKey]
                ) + '/'
            else if (Tools.isPlainObject(configuration.path[key][subKey])) {
                configuration.path[key][subKey].base = path.resolve(
                    configuration.path[key].base,
                    configuration.path[key][subKey].base)
                for (const subSubKey:string in configuration.path[key][subKey])
                    if (
                        Object.prototype.hasOwnProperty.call(
                            configuration.path[key][subKey], subSubKey
                        ) &&
                        subSubKey !== 'base' &&
                        typeof configuration.path[key][subKey][
                            subSubKey
                        ] === 'string'
                    )
                        configuration.path[key][subKey][subSubKey] =
                            path.resolve(
                                configuration.path[key][subKey].base,
                                configuration.path[key][subKey][subSubKey]
                            ) + '/'
            }
    }
// / endregion
const now:Date = new Date()
export const resolvedConfiguration:ResolvedConfiguration =
    Tools.evaluateDynamicDataStructure(
        configuration,
        {
            currentPath: process.cwd(),
            fileSystem,
            Helper,
            isDLLUseful:
                2 < configuration.givenCommandLineArguments.length &&
                (
                    ['build:dll', 'watch:dll'].includes(
                        configuration.givenCommandLineArguments[2]) ||
                    configuration.dllManifestFilePaths.length &&
                    ['build', 'serve', 'test:browser'].includes(
                        configuration.givenCommandLineArguments[2]
                    )
                ),
            path,
            /* eslint-disable no-eval */
            require: eval('require'),
            /* eslint-enable no-eval */
            Tools,
            webOptimizerPath: __dirname,
            now,
            nowUTCTimestamp: Tools.numberGetUTCTimestamp(now)
        }
    )
// region consolidate file specific build configuration
// Apply default file level build configurations to all file type specific
// ones.
const defaultConfiguration:PlainObject =
    resolvedConfiguration.buildContext.types.default
delete resolvedConfiguration.buildContext.types.default
for (const type:string in resolvedConfiguration.buildContext.types)
    if (Object.prototype.hasOwnProperty.call(
        resolvedConfiguration.buildContext.types, type
    ))
        resolvedConfiguration.buildContext.types[type] = Tools.extend(
            true,
            {},
            defaultConfiguration,
            Tools.extend(
                true,
                {extension: type},
                resolvedConfiguration.buildContext.types[type],
                {type}
            )
        )
// endregion
// region resolve module location and determine which asset types are needed
resolvedConfiguration.module.locations = Helper.determineModuleLocations(
    resolvedConfiguration.injection.entry,
    resolvedConfiguration.module.aliases,
    resolvedConfiguration.module.replacements.normal,
    {
        file: resolvedConfiguration.extensions.file.internal,
        module: resolvedConfiguration.extensions.module
    },
    resolvedConfiguration.path.context,
    resolvedConfiguration.path.source.asset.base
)
resolvedConfiguration.injection = Helper.resolveInjection(
    resolvedConfiguration.injection,
    Helper.resolveBuildConfigurationFilePaths(
        resolvedConfiguration.buildContext.types,
        resolvedConfiguration.path.source.asset.base,
        Helper.normalizePaths(
            resolvedConfiguration.path.ignore.concat(
                resolvedConfiguration.module.directoryNames,
                resolvedConfiguration.loader.directoryNames
            ).map((filePath:string):string =>
                path.resolve(resolvedConfiguration.path.context, filePath)
            ).filter((filePath:string):boolean =>
                !resolvedConfiguration.path.context.startsWith(filePath)
            )
        ),
        resolvedConfiguration.package.main.fileNames
    ),
    resolvedConfiguration.injection.autoExclude,
    resolvedConfiguration.module.aliases,
    resolvedConfiguration.module.replacements.normal,
    resolvedConfiguration.extensions,
    resolvedConfiguration.path.context,
    resolvedConfiguration.path.source.asset.base,
    resolvedConfiguration.path.ignore
)
const entryInjection:any = resolvedConfiguration.injection.entry
resolvedConfiguration.injection.entry = {
    given: resolvedConfiguration.injection.entry,
    normalized: Helper.resolveModulesInFolders(
        Helper.normalizeEntryInjection(entryInjection),
        resolvedConfiguration.module.aliases,
        resolvedConfiguration.module.replacements.normal,
        resolvedConfiguration.path.context,
        resolvedConfiguration.path.source.asset.base,
        resolvedConfiguration.path.ignore.concat(
            resolvedConfiguration.module.directoryNames,
            resolvedConfiguration.loader.directoryNames
        ).map((filePath:string):string =>
            path.resolve(resolvedConfiguration.path.context, filePath)
        ).filter((filePath:string):boolean =>
            !resolvedConfiguration.path.context.startsWith(filePath)
        )
    )
}
resolvedConfiguration.needed = {
    javaScript: configuration.debug && ['serve', 'test:browser'].includes(
        resolvedConfiguration.givenCommandLineArguments[2]
    )
}
for (
    const chunkName:string in resolvedConfiguration.injection.entry.normalized
)
    if (Object.prototype.hasOwnProperty.call(
        resolvedConfiguration.injection.entry.normalized, chunkName
    ))
        for (const moduleID:string of resolvedConfiguration.injection.entry
            .normalized[chunkName]
        ) {
            const filePath:null|string = Helper.determineModuleFilePath(
                moduleID,
                resolvedConfiguration.module.aliases,
                resolvedConfiguration.module.replacements.normal,
                {
                    file: resolvedConfiguration.extensions.file.internal,
                    module: resolvedConfiguration.extensions.module
                },
                resolvedConfiguration.path.context,
                /*
                    NOTE: We doesn't use
                    "resolvedConfiguration.path.source.asset.base" because we
                    have already resolve all module ids.
                */
                './',
                resolvedConfiguration.path.ignore,
                resolvedConfiguration.module.directoryNames,
                resolvedConfiguration.package.main.fileNames,
                resolvedConfiguration.package.main.propertyNames,
                resolvedConfiguration.package.aliasPropertyNames,
                resolvedConfiguration.encoding
            )
            let type:null|string = null
            if (filePath)
                type = Helper.determineAssetType(
                    filePath,
                    resolvedConfiguration.buildContext.types,
                    resolvedConfiguration.path
                )
            else
                throw new Error(
                    `Given request "${moduleID}" couldn't be resolved.`)
            if (type)
                resolvedConfiguration.needed[type] = true
        }
// endregion
// region adding special aliases
// NOTE: This alias couldn't be set in the "package.json" file since this would
// result in an endless loop.
resolvedConfiguration.loader.aliases.webOptimizerDefaultTemplateFileLoader = ''
for (const loader:PlainObject of resolvedConfiguration.files.defaultHTML
    .template.use
) {
    if (
        resolvedConfiguration.loader.aliases
            .webOptimizerDefaultTemplateFileLoader
    )
        resolvedConfiguration.loader.aliases
            .webOptimizerDefaultTemplateFileLoader += '!'
    resolvedConfiguration.loader.aliases
        .webOptimizerDefaultTemplateFileLoader += loader.loader
    if (loader.options)
        resolvedConfiguration.loader.aliases
            .webOptimizerDefaultTemplateFileLoader += '?' +
                Tools.convertCircularObjectToJSON(loader.options)
}
resolvedConfiguration.module.aliases.webOptimizerDefaultTemplateFilePath$ =
    resolvedConfiguration.files.defaultHTML.template.filePath
// endregion
// region apply html webpack plugin workarounds
/*
    NOTE: Provides a workaround to handle a bug with chained loader
    configurations.
*/
for (
    const htmlConfiguration:HTMLConfiguration of
    resolvedConfiguration.files.html
) {
    Tools.extend(
        true, htmlConfiguration, resolvedConfiguration.files.defaultHTML)
    htmlConfiguration.template.request = htmlConfiguration.template.filePath
    if (
        htmlConfiguration.template.filePath !==
            resolvedConfiguration.files.defaultHTML.template.filePath &&
        htmlConfiguration.template.options
    ) {
        const requestString:Record<string, any> = new String(
            htmlConfiguration.template.request +
            Tools.convertCircularObjectToJSON(
                htmlConfiguration.template.options))
        requestString.replace = ((string:string):Function => (
            _search:RegExp|string,
            _replacement:string|Function
        ):string => string)(htmlConfiguration.template.filePath)
        htmlConfiguration.template.request = requestString
    }
}
// endregion
export default resolvedConfiguration
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
