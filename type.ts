// #!/usr/bin/env babel-node
// -*- coding: utf-8 -*-
/** @module type */
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
    Encoding, Mapping, PlainObject, ProcedureFunction, SecondParameter
} from 'clientnode/type'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import {JSDOM} from 'jsdom'
import {
    DefinePlugin as WebpackDefinePlugin,
    Configuration as BaseWebpackConfiguration,
    Entry as WebpackEntry,
    IgnorePlugin as WebpackIgnorePlugin,
    Module as WebpackModule,
    ModuleOptions as WebpackModuleOptions,
    WebpackOptionsNormalized
} from 'webpack'
import {Options as RemoveDirectoryRecursivelyOptions} from 'rimraf'
import {
    CommonOptions as WorkboxCommonOptions,
    GenerateSWOptions as WorkboxGenerateSWOptions,
    InjectManifestOptions as WorkboxInjectManifestOptions
} from 'workbox-webpack-plugin'
// endregion
// region exports
// / region generic
export interface Browser {
    debug:boolean
    domContentLoaded:boolean
    DOM:typeof JSDOM|null
    initialized:boolean
    instance:JSDOM|null
    window:null|Window
    windowLoaded:boolean
}
export interface InitializedBrowser extends Browser {
    DOM:typeof JSDOM
    instance:JSDOM
    window:Window
}
export interface PackageConfiguration {
    name:string
    version:string
}
export interface PackageDescriptor {
    configuration:PackageConfiguration
    filePath:string
}
export type Replacements = Mapping<SecondParameter<String['replace']>>
export type Resolvable = {
    [TYPE in '__evaluate__'|'__execute__'|string]:any|Resolvable|string
}
// / endregion
// / region injection
export type ExternalAliases = Mapping<Mapping<Function|string>>
export type ExternalInjection =
    string|
    ((
        parameter:{
            context:string
            request:string
        },
        callback:ProcedureFunction
    ) => void)|
    RegExp|
    Array<ExternalInjection>
export type GivenInjection =
    Function|string|Array<string>|Mapping<string|Array<string>>
export type NormalizedGivenInjection = Mapping<Array<string>>
export interface GivenInjectionConfiguration {
    autoExclude:Array<string>
    entry:GivenInjection
    external:GivenInjection
}
export interface InjectionConfiguration {
    autoExclude:Array<string>
    chunks:PlainObject
    entry:{
        given:GivenInjection
        normalized:NormalizedGivenInjection
    }
    external:{
        aliases:ExternalAliases
        implicit:{
            pattern:{
                exclude:Array<RegExp|string>
                include:Array<RegExp|string>
            }
        }
        modules:ExternalInjection
    }
    externalAliases:Mapping
    ignorePattern:Array<WebpackIgnorePlugin['options']>|WebpackIgnorePlugin['options']
    implicitExternalExcludePattern:Array<RegExp|string>
    implicitExternalIncludePattern:Array<RegExp|string>
}
// / endregion
// / region configuration
// // region path
export interface AssetPathConfiguration {
    base:string
    cascadingStyleSheet:string
    data:string
    font:string
    image:string
    javaScript:string
    template:string
}
export interface PathConfiguration {
    apiDocumentation:string
    base:string
    configuration:{
        javaScript:string
        json:string
        typeScript:string
    }
    context:string
    ignore:Array<string>
    source:{
        asset:AssetPathConfiguration
        base:string
    }
    target:{
        asset:AssetPathConfiguration
        base:string
        manifest:string
        public:string
    }
    tidyUp:Array<string>
    tidyUpOnClear:Array<string>
    tidyUpOnClearGlobs:{
        options:RemoveDirectoryRecursivelyOptions
        pattern:Array<string>
    }
}
// // endregion
// // region build
export interface BuildConfigurationItem {
    extension:string
    ignoredExtension:string
    filePathPattern:string
    outputExtension:string
}
export type BuildConfiguration = Mapping<BuildConfigurationItem>
export const SubConfigurationTypes = [
    'debug', 'document', 'test', 'test:browser'
] as const
export const TaskTypes = ['build', 'serve', ...SubConfigurationTypes] as const
// // endregion
// // region loader
export type BooleanExpression = boolean|null|string
export interface AdditionalLoaderConfiguration {
    exclude?:BooleanExpression
    include?:BooleanExpression
    test:string
    use:any
}
export interface AdditionalLoaderConfigurations {
    post:Array<AdditionalLoaderConfiguration>
    pre:Array<AdditionalLoaderConfiguration>
}
export interface AdditionalLoader {
    post:Array<string>
    pre:Array<string>
}
export interface WebpackLoader {
    loader:string
    options?:PlainObject
}
export type ResourceLoaderConfiguration = WebpackLoader & {
    exclude:BooleanExpression
    include:BooleanExpression
    loader:Array<string>
    regularExpression:string
}
export interface LoaderConfiguration extends ResourceLoaderConfiguration {
    additional:AdditionalLoaderConfigurations
}
export interface WebpackLoaderConfiguration {
    exclude:WebpackLoaderIndicator
    include:WebpackLoaderIndicator
    test:RegExp
    use:Array<WebpackLoader>|WebpackLoader
}
export type WebpackLoaderIndicator =
    Array<WebpackLoaderIndicator>|Function|string
// // endregion
export interface Command {
    arguments:Array<string>
    command:string
    indicator?:string
}
export interface CommandLineArguments {
    build:Command
    document:Array<Command>|Command
    lint:Array<Command>|Command
    serve:Array<Command>|Command
    test:Array<Command>|Command
    'test:browser':Array<Command>|Command
    'check:types':Array<Command>|Command
}
export type NodeEnvironment = Mapping<boolean|string> & {'#':string}
export interface PluginConfiguration {
    name:{
        initializer:string
        module:string
    }
    parameter:Array<any>
}
export interface DefaultConfiguration {
    contextType:string
    debug:boolean
    document:PlainObject
    encoding:Encoding
    givenCommandLineArguments:Array<string>
    library:boolean
    nodeEnvironment:NodeEnvironment
    path:Resolvable
    plugins:Array<PluginConfiguration>
    test:PlainObject
    'test:browser':PlainObject
}
/* eslint-disable max-len */
export type ExportFormat = 'amd'|'amd-require'|'assign'|'global'|'jsonp'|'var'|'this'|'commonjs'|'commonjs2'|'umd'
/* eslint-enable max-len */
export interface HTMLConfiguration {
    filename:string
    template:{
        filePath:string
        options?:PlainObject
        postCompileOptions:PlainObject
        request:string|string
        use:Array<WebpackLoader>|WebpackLoader
    }
}
export interface MetaConfiguration {
    default:DefaultConfiguration
    debug:Resolvable
    library:Resolvable
}
export interface ResolvedBuildConfigurationItem extends BuildConfigurationItem {
    filePaths:Array<string>
}
export interface Extensions {
    file:{
        external:Array<string>
        internal:Array<string>
    }
}
export interface SpecificExtensions {file:Array<string>}
export interface InPlaceAssetConfiguration {
    body?:Array<RegExp|string>|RegExp|string
    head?:Array<RegExp|string>|RegExp|string
}
export interface InPlaceConfiguration {
    cascadingStyleSheet:InPlaceAssetConfiguration
    externalLibrary:{
        normal:boolean
        dynamic:boolean
    }
    javaScript:InPlaceAssetConfiguration
    otherMaximumFileSizeLimitInByte:number
}
export interface ResolvedConfiguration {
    assetPattern:Mapping<{
        excludeFilePathRegularExpression:string
        includeFilePathRegularExpression:string
        pattern:string
    }>
    buildContext:{
        definitions:WebpackDefinePlugin['definitions']
        types:BuildConfiguration
    }
    cache?:{
        main?:WebpackOptionsNormalized['cache']
        unsafe?:WebpackModuleOptions['unsafeCache']
    }
    commandLine:CommandLineArguments
    contextType:string
    debug:boolean
    development:{
        server:WebpackOptionsNormalized['devServer'] & {
            /*
                NOTE: We need these values mandatory to inject development
                handler beforehand.
            */
            host:string
            https:boolean
            liveReload:boolean
            port:number
        }
        tool:WebpackOptionsNormalized['devtool']
    }
    document:PlainObject
    encoding:Encoding
    exportFormat:{
        external:ExportFormat
        globalObject:string
        self:ExportFormat
    }
    extensions:Extensions
    favicon:Mapping<any> & {logo:string}
    files:{
        additionalPaths:Array<string>
        compose:{
            cascadingStyleSheet:string
            image:string
            javaScript:string
        }
        defaultHTML:HTMLConfiguration
        html:Array<HTMLConfiguration>
    }
    givenCommandLineArguments:Array<string>
    hashAlgorithm:string
    injection:InjectionConfiguration
    inPlace:InPlaceConfiguration
    library:boolean
    libraryName:string
    loader:{
        aliases:Mapping
        directoryNames:Array<string>
        extensions:{
            file:Array<string>
        }
        resolveSymlinks:boolean
    }
    module:{
        additional:AdditionalLoaderConfigurations
        aliases:Mapping
        cascadingStyleSheet:ResourceLoaderConfiguration
        directoryNames:Array<string>
        enforceDeduplication:boolean
        html:LoaderConfiguration
        locations:{
            directoryPaths:Array<string>
            filePaths:Array<string>
        }
        optimizer:{
            babelMinify?:{
                bundle?:{
                    plugin?:PlainObject
                    transform?:PlainObject
                }
                module?:PlainObject
            }
            cssnano:PlainObject
            data:ResourceLoaderConfiguration
            font:{
                eot:ResourceLoaderConfiguration
                svg:ResourceLoaderConfiguration
                ttf:ResourceLoaderConfiguration
                woff:ResourceLoaderConfiguration
            }
            htmlMinifier?:PlainObject
            image:{
                content:PlainObject
                exclude:string
                loader:Array<string>
            }
            minimize:boolean
            minimizer:Array<PlainObject>
        }
        preprocessor:{
            cascadingStyleSheet:WebpackLoader & {
                additional:{
                    plugins:AdditionalLoader
                    post:Array<string>
                    pre:Array<string>
                }
                postcssPresetEnv:PlainObject
            }
            ejs:LoaderConfiguration
            html:LoaderConfiguration
            javaScript:LoaderConfiguration
            json:{
                exclude:string
                loader:string
            }
        }
        provide:Mapping|null
        replacements:{
            context:Array<[string, string]>
            normal:Replacements
        }
        resolveSymlinks:boolean
        skipParseRegularExpressions:WebpackModuleOptions['noParse']
        style:WebpackLoader
    }
    name:string
    needed:Mapping<boolean>
    nodeENV:false|null|string
    nodeEnvironment:NodeEnvironment
    offline:{
        common:WorkboxCommonOptions
        injectionManifest:WorkboxInjectManifestOptions
        serviceWorker:WorkboxGenerateSWOptions
        use:'injectionManifest'|'serviceWorker'
    }
    package:{
        aliasPropertyNames:Array<string>
        main:{
            fileNames:Array<string>
            propertyNames:Array<string>
        }
    }
    path:PathConfiguration
    performanceHints:{hints:false|string}
    plugins:Array<PluginConfiguration>
    showConfiguration:boolean
    stylelint:PlainObject
    targetTechnology: {
        boilerplate:string
        payload:string
    }
    test:PlainObject
    'test:browser':PlainObject
    webpack:WebpackConfiguration
}
export type ResolvedBuildConfiguration = Array<ResolvedBuildConfigurationItem>
export type WebpackConfiguration = BaseWebpackConfiguration & {
    // region input
    entry:WebpackEntry
    // endregion
    module:WebpackModule
    // region output
    output:PlainObject
    // endregion
    replaceWebOptimizer:WebpackConfiguration
}
// / endregion
// NOTE: Not yet defined in webpack types.
export interface WebpackBaseAssets {
    outputName:string
    plugin:HtmlWebpackPlugin
}
export interface WebpackAssets extends WebpackBaseAssets {
    bodyTags:HtmlWebpackPlugin.HtmlTagObject[]
    headTags:HtmlWebpackPlugin.HtmlTagObject[]
    outputName:string
    publicPath:string
    plugin:HtmlWebpackPlugin
}
export interface HTMLWebpackPluginAssetTagGroupsData {
    bodyTags:HtmlWebpackPlugin.HtmlTagObject[]
    headTags:HtmlWebpackPlugin.HtmlTagObject[]
    outputName:string
    plugin:HtmlWebpackPlugin
}
export interface HTMLWebpackPluginBeforeEmitData {
    html:string
    outputName:string
    plugin:HtmlWebpackPlugin
}
// endregion
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
