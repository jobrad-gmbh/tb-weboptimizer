// #!/usr/bin/env babel-node
// -*- coding: utf-8 -*-
/** @module configurator */
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
import Tools, {currentRequire, optionalRequire} from 'clientnode'
import {Mapping, PlainObject, RecursiveEvaluateable} from 'clientnode/type'
import fileSystem, {lstatSync, readFileSync, unlink} from 'fs'
import path, {basename, dirname, join, resolve} from 'path'

import Helper from './helper'
import {configuration as metaConfiguration} from './package.json'
import {
    DefaultConfiguration,
    GivenInjection,
    GivenInjectionConfiguration,
    InjectionConfiguration,
    ResolvedBuildConfigurationItem,
    ResolvedConfiguration,
    RuntimeInformation,
    SubConfigurationTypes
} from './type'
/*
    To assume to go two folder up from this file until there is no
    "node_modules" parent folder is usually resilient again dealing with
    projects where current working directory isn't the projects directory and
    this library is located as a nested dependency.
*/
metaConfiguration.default.path.context = __dirname
while (true) {
    metaConfiguration.default.path.context =
        resolve(metaConfiguration.default.path.context, '../../')
    if (
        basename(dirname(metaConfiguration.default.path.context)) !==
            'node_modules'
    )
        break
}
if (
    basename(dirname(process.cwd())) === 'node_modules' ||
    basename(dirname(process.cwd())) === '.staging' &&
    basename(dirname(dirname(process.cwd()))) === 'node_modules'
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
        if (lstatSync(join(process.cwd(), 'node_modules')).isSymbolicLink())
            metaConfiguration.default.path.context = process.cwd()
    } catch (error) {
        // continue regardless of error
    }
let specificConfiguration:PlainObject = {}
try {
    /* eslint-disable no-eval */
    specificConfiguration = (eval('require') as typeof require)(join(
        metaConfiguration.default.path.context, 'package'
    )) as PlainObject
    /* eslint-enable no-eval */
} catch (error) {
    metaConfiguration.default.path.context = process.cwd()
}
const name:string = typeof specificConfiguration.name === 'string' ?
    specificConfiguration.name :
    'mockup'
specificConfiguration =
    (specificConfiguration.webOptimizer as PlainObject) || {}
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
    typeof process.env.NODE_ENV === 'string' &&
    ['debug', 'dev', 'development'].includes(process.env.NODE_ENV)
)
    debug = true
if (debug)
    // NOTE: We have to avoid that some pre-processor removes this assignment.
    eval(`process.env.NODE_ENV = 'development'`)
// endregion
// region loading default configuration
metaConfiguration.default.path.context += '/'
// Merges final default configuration object depending on given target
// environment.
const libraryConfiguration:PlainObject = metaConfiguration.library
let configuration:DefaultConfiguration
if (debug)
    configuration = Tools.extend<DefaultConfiguration>(
        true,
        Tools.modifyObject<DefaultConfiguration>(
            metaConfiguration.default as DefaultConfiguration,
            metaConfiguration.debug
        )!,
        metaConfiguration.debug
    )
else
    configuration = metaConfiguration.default as DefaultConfiguration
configuration.debug = debug
if (typeof configuration.library === 'object')
    Tools.extend(
        true,
        Tools.modifyObject(libraryConfiguration, configuration.library)!,
        configuration.library
    )
if (configuration.library && specificConfiguration?.library !== false)
    configuration = Tools.extend(
        true,
        Tools.modifyObject(configuration, libraryConfiguration)!,
        libraryConfiguration
    )
// endregion
// region merging and evaluating task specific and dynamic configurations
// / region load additional dynamically given configuration
let count = 0
let filePath:null|string = null
while (true) {
    const newFilePath =
        `${configuration.path.context}.dynamicConfiguration-${count}.json`

    if (!Tools.isFileSync(newFilePath))
        break

    filePath = newFilePath
    count += 1
}

let runtimeInformation:RuntimeInformation =
    {givenCommandLineArguments: process.argv}
if (filePath) {
    runtimeInformation = JSON.parse(readFileSync(
        filePath, {encoding: configuration.encoding}
    )) as RuntimeInformation

    unlink(filePath, (error:Error|null):void => {
        if (error)
            throw error
    })
}
// // region task specific configuration
// /// region apply task type specific configuration
if (runtimeInformation.givenCommandLineArguments.length > 2)
    for (const type of SubConfigurationTypes)
        if (
            runtimeInformation.givenCommandLineArguments[2] === type ||
            debug && type === 'debug' ||
            type === 'test' &&
            runtimeInformation.givenCommandLineArguments[2].startsWith(
                'test:'
            ) &&
            runtimeInformation.givenCommandLineArguments[2] !== 'test:browser'
        )
            for (const configurationTarget of [
                configuration, specificConfiguration
            ])
                if (Tools.isPlainObject(configurationTarget[
                    type as keyof DefaultConfiguration
                ]))
                    Tools.extend(
                        true,
                        Tools.modifyObject<DefaultConfiguration>(
                            configurationTarget as DefaultConfiguration,
                            configurationTarget[type]
                        )!,
                        configurationTarget[type] as PlainObject
                    )
// /// endregion
// /// region clear task type specific configurations
for (const type of SubConfigurationTypes)
    for (const configurationTarget of [configuration, specificConfiguration])
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
        runtimeInformation
    )!,
    specificConfiguration,
    runtimeInformation
)

let result:null|PlainObject = null
if (runtimeInformation.givenCommandLineArguments.length > 3)
    result = Tools.stringParseEncodedObject(
        runtimeInformation.givenCommandLineArguments[
            runtimeInformation.givenCommandLineArguments.length - 1
        ],
        configuration as unknown as Mapping<unknown>,
        'configuration'
    )

if (result !== null && typeof result === 'object') {
    if (Object.prototype.hasOwnProperty.call(result, '__reference__')) {
        const referenceNames:Array<string> =
            ([] as Array<string>).concat(result.__reference__ as string)
        delete result.__reference__
        for (const name of referenceNames)
            Tools.extend(
                true,
                result,
                configuration[name as keyof DefaultConfiguration] as
                    PlainObject
            )
    }

    Tools.extend(true, Tools.modifyObject(configuration, result)!, result)
}
// Removing comments (default key name to delete is "#").
configuration = Tools.removeKeyPrefixes(configuration)
// endregion
// / region build absolute paths
configuration.path.base =
    resolve(configuration.path.context, configuration.path.base)

for (const key in configuration.path)
    if (
        Object.prototype.hasOwnProperty.call(configuration.path, key) &&
        !['base', 'configuration'].includes(key)
    )
        if (typeof configuration.path[key] === 'string')
            configuration.path[key] =
                resolve(
                    configuration.path.base, configuration.path[key] as string
                ) +
                '/'
        else if (Tools.isPlainObject(configuration.path[key])) {
            if (Object.prototype.hasOwnProperty.call(
                configuration.path[key as 'source'], 'base'
            ))
                configuration.path[key as 'source'].base = resolve(
                    configuration.path.base,
                    configuration.path[key as 'source'].base
                )

            for (const subKey in configuration.path[key] as PlainObject)
                if (
                    Object.prototype.hasOwnProperty.call(
                        configuration.path[key], subKey
                    ) &&
                    !['base', 'public'].includes(subKey) &&
                    typeof configuration.path[key as 'target'][
                        subKey as 'manifest'
                    ] === 'string'
                )
                    configuration.path[key as 'target'][subKey as 'manifest'] =
                        resolve(
                            configuration.path[key as 'target'].base,
                            configuration.path[key as 'target'][
                                subKey as 'manifest'
                            ]
                        ) +
                        '/'
                else if (
                    subKey !== 'options' &&
                    Tools.isPlainObject(
                        configuration.path[key as 'source'][subKey as 'asset']
                    )
                ) {
                    configuration.path[key as 'source'][subKey as 'asset']
                        .base = resolve(
                            configuration.path[key as 'source'].base,
                            configuration.path[key as 'source'][
                                subKey as 'asset'
                            ].base
                        )

                    for (const subSubKey in configuration.path[
                        key as 'source'
                    ][subKey as 'asset'])
                        if (
                            Object.prototype.hasOwnProperty.call(
                                configuration.path[key as 'source'][
                                    subKey as 'asset'
                                ],
                                subSubKey
                            ) &&
                            subSubKey !== 'base' &&
                            typeof configuration.path[key as 'source'][
                                subKey as 'asset'
                            ][subSubKey as 'data'] === 'string'
                        )
                            configuration.path[key as 'source'][
                                subKey as 'asset'
                            ][subSubKey as 'data'] =
                                resolve(
                                    configuration.path[key as 'source'][
                                        subKey as 'asset'
                                    ].base,
                                    configuration.path[key as 'source'][
                                        subKey as 'asset'
                                    ][subSubKey as 'data']
                                ) +
                                '/'
                }
        }
// / endregion
const now:Date = new Date()
/*
    NOTE: The configuration is not yet fully resolved but will be transformed
    in place in the following lines of code.
*/
export const resolvedConfiguration:ResolvedConfiguration =
    Tools.evaluateDynamicData<ResolvedConfiguration>(
        configuration as
            unknown as
            RecursiveEvaluateable<ResolvedConfiguration>,
        {
            currentPath: process.cwd(),
            fileSystem,
            Helper,
            optionalRequire,
            path,
            require: currentRequire,
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
    resolvedConfiguration.buildContext.types.default as unknown as PlainObject
delete resolvedConfiguration.buildContext.types.default
for (const type in resolvedConfiguration.buildContext.types)
    if (Object.prototype.hasOwnProperty.call(
        resolvedConfiguration.buildContext.types, type
    ))
        resolvedConfiguration.buildContext.types[type] =
            Tools.extend<ResolvedBuildConfigurationItem>(
                true,
                Tools.copy(defaultConfiguration),
                Tools.extend<ResolvedBuildConfigurationItem>(
                    true,
                    {extension: type},
                    resolvedConfiguration.buildContext.types[type],
                    {type}
                )
            )
// endregion
// region resolve module location and determine which asset types are needed
resolvedConfiguration.module.locations = Helper.determineModuleLocations(
    resolvedConfiguration.injection.entry.normalized,
    resolvedConfiguration.module.aliases,
    resolvedConfiguration.module.replacements.normal,
    {file: resolvedConfiguration.extensions.file.internal},
    resolvedConfiguration.path.context,
    resolvedConfiguration.path.source.asset.base
)
resolvedConfiguration.injection = Helper.resolveAutoInjection(
    resolvedConfiguration.injection as unknown as GivenInjectionConfiguration,
    Helper.resolveBuildConfigurationFilePaths(
        resolvedConfiguration.buildContext.types,
        resolvedConfiguration.path.source.asset.base,
        Helper.normalizePaths(
            resolvedConfiguration.path.ignore.concat(
                resolvedConfiguration.module.directoryNames,
                resolvedConfiguration.loader.directoryNames
            ).map((filePath:string):string =>
                resolve(resolvedConfiguration.path.context, filePath)
            ).filter((filePath:string):boolean =>
                !resolvedConfiguration.path.context.startsWith(filePath)
            )
        ),
        resolvedConfiguration.package.main.fileNames
    ),
    resolvedConfiguration.module.aliases,
    resolvedConfiguration.module.replacements.normal,
    resolvedConfiguration.extensions,
    resolvedConfiguration.path.context,
    resolvedConfiguration.path.source.asset.base,
    resolvedConfiguration.path.ignore
) as unknown as InjectionConfiguration
const givenInjection:GivenInjection =
    resolvedConfiguration.injection.entry as unknown as GivenInjection
resolvedConfiguration.injection.entry = {
    given: givenInjection,
    normalized: Helper.resolveModulesInFolders(
        Helper.normalizeGivenInjection(givenInjection),
        resolvedConfiguration.module.aliases,
        resolvedConfiguration.module.replacements.normal,
        resolvedConfiguration.path.context,
        resolvedConfiguration.path.source.asset.base,
        resolvedConfiguration.path.ignore.concat(
            resolvedConfiguration.module.directoryNames,
            resolvedConfiguration.loader.directoryNames
        ).map((filePath:string):string =>
            resolve(resolvedConfiguration.path.context, filePath)
        ).filter((filePath:string):boolean =>
            !resolvedConfiguration.path.context.startsWith(filePath)
        )
    )
}
resolvedConfiguration.needed = {
    javaScript:
        configuration.debug &&
        ['serve', 'test:browser'].includes(
            resolvedConfiguration.givenCommandLineArguments[2]
        )
}
for (const chunkName in resolvedConfiguration.injection.entry.normalized)
    if (Object.prototype.hasOwnProperty.call(
        resolvedConfiguration.injection.entry.normalized, chunkName
    ))
        for (
            const moduleID of
            resolvedConfiguration.injection.entry.normalized[chunkName]
        ) {
            const filePath:null|string = Helper.determineModuleFilePath(
                moduleID,
                resolvedConfiguration.module.aliases,
                resolvedConfiguration.module.replacements.normal,
                {file: resolvedConfiguration.extensions.file.internal},
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
for (const loader of Array.isArray(
    resolvedConfiguration.files.defaultHTML.template.use
) ?
    resolvedConfiguration.files.defaultHTML.template.use :
    [resolvedConfiguration.files.defaultHTML.template.use]
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
            .webOptimizerDefaultTemplateFileLoader +=
                '?' +
                (Tools.convertCircularObjectToJSON(loader.options) as string)
}
resolvedConfiguration.module.aliases.webOptimizerDefaultTemplateFilePath =
    resolvedConfiguration.files.defaultHTML.template.filePath
// endregion
// region apply html webpack plugin workarounds
/*
    NOTE: Provides a workaround to handle a bug with chained loader
    configurations.
*/
for (const htmlConfiguration of resolvedConfiguration.files.html) {
    Tools.extend(
        true, htmlConfiguration, resolvedConfiguration.files.defaultHTML
    )
    htmlConfiguration.template.request = htmlConfiguration.template.filePath
    if (
        htmlConfiguration.template.filePath !==
            resolvedConfiguration.files.defaultHTML.template.filePath &&
        htmlConfiguration.template.options
    ) {
        const requestString:string = new String(
            htmlConfiguration.template.request +
            (Tools.convertCircularObjectToJSON(
                htmlConfiguration.template.options
            ) as string)
        ) as string
        /* eslint-disable @typescript-eslint/unbound-method */
        requestString.replace = ((value:string) => ():string => value)(
            htmlConfiguration.template.filePath
        )
        /* eslint-enable @typescript-eslint/unbound-method */
        htmlConfiguration.template.request = requestString
    }
}
// endregion
export default resolvedConfiguration
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
