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
import fileSystem, {lstatSync, readFileSync, unlinkSync} from 'fs'
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
// endregion
export let loadedConfiguration:null|ResolvedConfiguration = null
/**
 * Main entry point to determine current configuration.
 * @param context - Location from where to build current application.
 * @param currentWorkingDirectory - Current working directory to use as
 * reference.
 * @param commandLineArguments - Arguments to take into account.
 * @param webOptimizerPath - Current optimizer context path.
 * @param environment - Environment variables to take into account.
 *
 * @returns Nothing.
 */
export const load = (
    context?:string,
    currentWorkingDirectory:string = process.cwd(),
    commandLineArguments:Array<string> = process.argv,
    webOptimizerPath:string = __dirname,
    /*
        NOTE: We have to avoid that some pre-processor removes this
        assignment.
    */
    // eslint-disable-next-lien no-eval
    environment:NodeJS.ProcessEnv = eval('process.env') as NodeJS.ProcessEnv
):ResolvedConfiguration => {
    // region determine application context location
    if (context)
        metaConfiguration.default.path.context = context
    else {
        /*
            To assume to go two folder up from this file until there is no
            "node_modules" parent folder is usually resilient again dealing
            with projects where current working directory isn't the projects
            directory and this library is located as a nested dependency.
        */
        metaConfiguration.default.path.context = webOptimizerPath
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
            basename(dirname(currentWorkingDirectory)) === 'node_modules' ||
            basename(dirname(currentWorkingDirectory)) === '.staging' &&
            basename(dirname(dirname(currentWorkingDirectory))) ===
                'node_modules'
        ) {
            /*
                NOTE: If we are dealing was a dependency project use current
                directory as context.
            */
            metaConfiguration.default.path.context = currentWorkingDirectory
            metaConfiguration.default.contextType = 'dependency'
        } else
            /*
                NOTE: If the current working directory references this file via
                a linked "node_modules" folder using current working directory
                as context is a better assumption than two folders up the
                hierarchy.
            */
            try {
                if (
                    lstatSync(join(currentWorkingDirectory, 'node_modules'))
                        .isSymbolicLink()
                )
                    metaConfiguration.default.path.context =
                        currentWorkingDirectory
            } catch (error) {
                // Continue regardless of error.
            }
    }
    // endregion
    // region load application specific configuration
    let specificConfiguration:PlainObject = {}
    try {
        specificConfiguration = currentRequire!(join(
            metaConfiguration.default.path.context, 'package'
        )) as PlainObject
    } catch (error) {
        metaConfiguration.default.path.context = currentWorkingDirectory
    }
    // endregion
    // region determine application name and web optimizer configuration
    const name:string = typeof specificConfiguration.name === 'string' ?
        specificConfiguration.name :
        (
            typeof (specificConfiguration.webOptimizer as PlainObject)?.name ===
                'string'
        ) ?
            (specificConfiguration.webOptimizer as Mapping)?.name :
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
        environment.npm_config_dev === 'true' ||
        typeof environment.NODE_ENV === 'string' &&
        ['debug', 'dev', 'development'].includes(environment.NODE_ENV)
    )
        debug = true
    if (debug)
        environment.NODE_ENV = 'development'
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
    /// region load additional dynamically given configuration
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
        {givenCommandLineArguments: commandLineArguments}
    if (filePath) {
        const fileContent:string = readFileSync(
            filePath, {encoding: configuration.encoding}
        )
        runtimeInformation = JSON.parse(fileContent) as RuntimeInformation
        unlinkSync(filePath)
    }
    //// region task specific configuration
    ///// region apply task type specific configuration
    if (runtimeInformation.givenCommandLineArguments.length > 2)
        for (const type of SubConfigurationTypes)
            if (
                runtimeInformation.givenCommandLineArguments[2] === type ||
                debug && type === 'debug' ||
                type === 'test' &&
                runtimeInformation.givenCommandLineArguments[2].startsWith(
                    'test:'
                ) &&
                runtimeInformation.givenCommandLineArguments[2] !==
                    'test:browser'
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
    ///// endregion
    ///// region clear task type specific configurations
    for (const type of SubConfigurationTypes)
        for (const configurationTarget of [
            configuration, specificConfiguration
        ])
            if (
                Object.prototype.hasOwnProperty.call(
                    configurationTarget, type
                ) &&
                typeof configurationTarget[type] === 'object'
            )
                delete configurationTarget[type]
    ///// endregion
    //// endregion
    /// endregion
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
                if (Object.prototype.hasOwnProperty.call(configuration, name))
                    Tools.extend(
                        true,
                        result,
                        configuration[name as keyof DefaultConfiguration] as
                            PlainObject
                    )
                else if (Tools.isFileSync(name))
                    Tools.extend(
                        true,
                        result,
                        JSON.parse(
                            readFileSync(name, configuration.encoding)
                        ) as PlainObject
                    )
                else
                    console.warn(
                        `Given dynamic referenced configuration "${name}" ` +
                        'could not be resolved.'
                    )
        }

        Tools.extend(true, Tools.modifyObject(configuration, result)!, result)
    }
    // Removing comments (default key name to delete is "#").
    configuration = Tools.removeKeyPrefixes(configuration)
    // endregion
    /// region build absolute paths
    configuration.path.base =
        resolve(configuration.path.context, configuration.path.base)

    for (const [key, path] of Object.entries(configuration.path))
        if (!['base', 'configuration'].includes(key))
            if (typeof path === 'string')
                configuration.path[key] =
                    resolve(configuration.path.base, path) + '/'
            else if (Tools.isPlainObject(path)) {
                if (Object.prototype.hasOwnProperty.call(path, 'base'))
                    configuration.path[key as 'source'].base = resolve(
                        configuration.path.base, path.base as string
                    )

                for (const [subKey, subPath] of Object.entries(path))
                    if (
                        !['base', 'public'].includes(subKey) &&
                        typeof subPath === 'string'
                    )
                        path[subKey as 'manifest'] =
                            resolve(path.base as string, subPath) + '/'
                    else if (
                        subKey !== 'options' && Tools.isPlainObject(subPath)
                    ) {
                        subPath.base = resolve(
                            path.base as string, subPath.base as string
                        )

                        for (const [subSubKey, subSubPath] of Object.entries(
                            subPath
                        ))
                            if (
                                subSubKey !== 'base' &&
                                typeof subSubPath === 'string'
                            )
                                subPath[subSubKey as 'data'] =
                                    resolve(subPath.base, subSubPath) + '/'
                    }
            }
    /// endregion
    // region evaluate dynamic configuration structures
    const now:Date = new Date()
    /*
        NOTE: The configuration is not yet fully resolved but will be
        transformed in place in the following lines of code.
    */
    const resolvedConfiguration:ResolvedConfiguration =
        Tools.evaluateDynamicData<ResolvedConfiguration>(
            configuration as
                unknown as
                RecursiveEvaluateable<ResolvedConfiguration>,
            {
                currentPath: currentWorkingDirectory,
                fileSystem,
                Helper,
                optionalRequire,
                path,
                require: currentRequire,
                Tools,
                webOptimizerPath,
                now,
                nowUTCTimestamp: Tools.numberGetUTCTimestamp(now)
            }
        )
    // endregion
    // region consolidate file specific build configuration
    // Apply default file level build configurations to all file type specific
    // ones.
    const defaultConfiguration:PlainObject =
        resolvedConfiguration.buildContext.types.default as
            unknown as
            PlainObject
    delete resolvedConfiguration.buildContext.types.default
    for (const [type, context] of Object.entries(
        resolvedConfiguration.buildContext.types
    ))
        resolvedConfiguration.buildContext.types[type] =
            Tools.extend<ResolvedBuildConfigurationItem>(
                true,
                Tools.copy(defaultConfiguration),
                Tools.extend<ResolvedBuildConfigurationItem>(
                    true, {extension: type}, context, {type}
                )
            )
    // endregion
    // region resolve module location and which asset types are needed
    resolvedConfiguration.module.locations = Helper.determineModuleLocations(
        resolvedConfiguration.injection.entry.normalized,
        resolvedConfiguration.module.aliases,
        resolvedConfiguration.module.replacements.normal,
        {file: resolvedConfiguration.extensions.file.internal},
        resolvedConfiguration.path.context,
        resolvedConfiguration.path.source.asset.base
    )
    resolvedConfiguration.injection = Helper.resolveAutoInjection(
        resolvedConfiguration.injection as
            unknown as
            GivenInjectionConfiguration,
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
    /// region determine which asset types are needed
    for (const chunk of Object.values(
        resolvedConfiguration.injection.entry.normalized
    ))
        for (const moduleID of chunk) {
            const filePath:null|string = Helper.determineModuleFilePath(
                moduleID,
                resolvedConfiguration.module.aliases,
                resolvedConfiguration.module.replacements.normal,
                {file: resolvedConfiguration.extensions.file.internal},
                resolvedConfiguration.path.context,
                /*
                    NOTE: We doesn't use
                    "resolvedConfiguration.path.source.asset.base" because we
                    already have resolved all module ids.
                */
                '',
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
                    `Given request "${moduleID}" couldn't be resolved.`
                )

            if (type)
                resolvedConfiguration.needed[type] = true
        }
    /// endregion
    // endregion
    // region adding special aliases
    /*
        NOTE: This alias couldn't be set in the "package.json" file since this
        would result in an endless loop.
    */
    resolvedConfiguration.loader.aliases
        .webOptimizerDefaultTemplateFileLoader = ''
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
                    (
                        Tools.convertCircularObjectToJSON(loader.options) as
                            string
                    )
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
    return resolvedConfiguration
}
/**
 * Get cached or determined configuration object.
 * @returns Nothing.
 */
export const get = ():ResolvedConfiguration => {
    if (loadedConfiguration)
        return loadedConfiguration

    loadedConfiguration = load()

    return loadedConfiguration
}

export default get
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
