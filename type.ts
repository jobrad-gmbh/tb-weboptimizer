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
import {PlainObject, ProcedureFunction, Window} from 'clientnode'
// endregion
// region exports
// / region generic
export type Browser = {
    debug:boolean;
    domContentLoaded:boolean;
    DOM:?Object;
    initialized:boolean;
    instance:null|Object;
    window:Window;
    windowLoaded:boolean;
}
// / endregion
// / region injection
export type ExternalInjection = string|((
    context:string, request:string, callback:ProcedureFunction
) => void)|RegExp|Array<ExternalInjection>
export type EntryInjection =
    Function|string|Array<string>|{[key:string]:string|Array<string>}
export type NormalizedEntryInjection = {[key:string]:Array<string>}
export type Injection = {
    autoExclude:Array<string>;
    chunks:PlainObject;
    dllChunkNames:Array<string>;
    entry:{
        given:EntryInjection;
        normalized:NormalizedEntryInjection
    };
    external:{
        aliases:PlainObject;
        implicit:{
            pattern:{
                exclude:Array<RegExp|string>;
                include:Array<RegExp|string>;
            };
        };
        modules:ExternalInjection;
    };
    externalAliases:PlainObject;
    ignorePattern:Array<string>;
    implicitExternalExcludePattern:Array<RegExp|string>;
    implicitExternalIncludePattern:Array<RegExp|string>;
}
// / endregion
// / region configuration
export type Additional = {
    post:Array<string>;
    pre:Array<string>;
}
export type AssetPath = {
    base:string;
    cascadingStyleSheet:string;
    data:string;
    font:string;
    image:string;
    javaScript:string;
    source:string;
    target:string;
    template:string;
}
export type BuildConfigurationItem = {
    extension:string;
    outputExtension:string;
    filePathPattern:string
}
export type BuildConfiguration = {[key:string]:BuildConfigurationItem}
export type Command = {
    arguments:Array<string>;
    command:string;
    indicator:?string;
}
export type Path = {
    apiDocumentation:string;
    base:string;
    configuration?:?{javaScript?:?string};
    context:string;
    ignore:Array<string>;
    source:{
        asset:AssetPath;
        base:string;
    };
    target:{
        asset:AssetPath;
        base:string;
        manifest:string;
        public:string;
    };
    tidyUp:Array<string>;
    tidyUpOnClear:Array<string>;
}
export type PluginConfiguration = {
    name:{
        initializer:string;
        module:string;
    };
    parameter:Array<any>;
}
export type DefaultConfiguration = {
    contextType:string;
    debug:boolean;
    dllManifestFilePaths:Array<any>;
    document:Object;
    encoding:string;
    library:boolean;
    nodeEnvironment:{[key:string]:boolean|'empty'|'mock'};
    path:Path;
    plugins:Array<PluginConfiguration>;
    test:Object;
    'test:browser':Object
}
/* eslint-disable max-len */
export type ExportFormat = 'amd'|'amd-require'|'assign'|'global'|'jsonp'|'var'|'this'|'commonjs'|'commonjs2'|'umd';
/* eslint-enable max-len */
export type HTMLConfiguration = {
    filename:string;
    template:{
        filePath:string;
        options:PlainObject;
        request:string|String;
        use:Array<{loader:string;options:Object}>;
    };
}
export type MetaConfiguration = {
    default:DefaultConfiguration;
    debug:PlainObject;
    library:PlainObject
}
export type ResolvedBuildConfigurationItem = {
    filePaths:Array<string>;
    extension:string;
    outputExtension:string;
    filePathPattern:string
}
export type Extensions = {
    file:{
        external:Array<string>;
        internal:Array<string>;
    };
    module:Array<string>;
}
export type LoaderConfiguration = {
    additional:Additional;
    exclude:string;
    include:string;
    loader:string;
    options:Object;
    regularExpression:string;
}
export type ResolvedConfiguration = {
    assetPattern:{[key:string]:{
        excludeFilePathRegularExpression:string;
        pattern:string
    }};
    buildContext:{
        definitions:PlainObject;
        types:PlainObject;
    };
    cache:{
        main:boolean;
        unsafe:boolean;
    };
    commandLine:{
        build:Command;
        document:Command;
        lint:Command;
        serve:Command;
        test:Command;
        'test:browser':Command;
        'check:type':Command;
    };
    contextType:string;
    debug:boolean;
    development:{
        openBrowser:PlainObject;
        server:PlainObject;
        tool:false|string;
    };
    dllManifestFilePaths:Array<string>;
    document:PlainObject;
    encoding:string;
    exportFormat:{
        external:ExportFormat;
        self:ExportFormat;
    };
    extensions:Extensions;
    favicon:{
        logo:string;
        [key:string]:any;
    };
    files:{
        additionalPaths:Array<string>;
        compose:{
            cascadingStyleSheet:string;
            image:string;
            javaScript:string;
        };
        defaultHTML:HTMLConfiguration;
        html:Array<HTMLConfiguration>;
    };
    givenCommandLineArguments:Array<string>;
    hashAlgorithm:string;
    injection:PlainObject;
    inPlace:{
        cascadingStyleSheet:{[key:string]:'body'|'head'|'in'|string};
        externalLibrary:{
            normal:boolean;
            dynamic:boolean;
        };
        javaScript:{[key:string]:'body'|'head'|'in'|string};
        otherMaximumFileSizeLimitInByte:number;
    };
    library:boolean;
    libraryName:string;
    loader:{
        aliases:PlainObject;
        directoryNames:Array<string>;
        extensions:{
            file:Array<string>;
            module:Array<string>;
        };
    };
    module:{
        additional:Additional;
        aliases:PlainObject;
        cascadingStyleSheet:LoaderConfiguration;
        directoryNames:Array<string>;
        html:LoaderConfiguration;
        locations:{filePaths:Array<string>;directoryPaths:Array<string>};
        optimizer:{
            babelMinify:?{
                bundle:?{
                    plugin:?PlainObject;
                    transform:?PlainObject;
                };
                module:?PlainObject;
            };
            cssnano:PlainObject;
            data:LoaderConfiguration;
            font:{
                eot:LoaderConfiguration;
                svg:LoaderConfiguration;
                ttf:LoaderConfiguration;
                woff:LoaderConfiguration;
            };
            htmlMinifier:?PlainObject;
            image:{
                additional:Additional;
                content:PlainObject;
                exclude:string;
                file:PlainObject;
                loader:string;
            };
            minimize:boolean;
            minimizer:Array<Object>;
        };
        preprocessor:{
            cascadingStyleSheet:{
                additional:{
                    plugins:Additional;
                    post:Array<string>;
                    pre:Array<string>;
                };
                loader:string;
                options:Object;
                postcssPresetEnv:Object;
            };
            ejs:LoaderConfiguration;
            html:LoaderConfiguration;
            javaScript:LoaderConfiguration;
            json:{
                exclude:string;
                loader:string;
            };
        };
        provide:{[key:string]:string};
        replacements:{
            context:Array<Array<string>>;
            normal:{[key:string]:Function|string};
        };
        skipParseRegularExpressions:RegExp|Array<RegExp>;
        style:PlainObject;
    };
    name:string;
    needed:{[key:string]:boolean};
    nodeEnvironment:{[key:string]:boolean|'empty'|'mock'};
    offline:PlainObject;
    package:{
        aliasPropertyNames:Array<string>;
        main:{
            fileNames:Array<string>;
            propertyNames:Array<string>;
        };
    };
    path:Path;
    performanceHints:{
        hints:false|string;
    };
    plugins:Array<PluginConfiguration>;
    showConfiguration:boolean;
    stylelint:PlainObject;
    /* eslint-disable max-len */
    targetTechnology:'web'|'webworker'|'node'|'async-node'|'node-webkit'|'electron'|'electron-renderer';
    /* eslint-enable max-len */
    test:PlainObject;
    'test:browser':PlainObject;
    webpack:WebpackConfiguration;
}
export type ResolvedBuildConfiguration = Array<ResolvedBuildConfigurationItem>
export type WebpackConfiguration = {
    cache:boolean;
    context:string;
    devtool:false|string;
    devServer:PlainObject;
    // region input
    entry:PlainObject;
    externals:ExternalInjection;
    resolve:{
        alias:PlainObject;
        extensions:Array<string>;
        moduleExtensions:Array<string>;
        modules:Array<string>;
        unsafeCache:boolean;
        aliasFields:Array<string>;
        mainFields:Array<string>;
        mainFiles:Array<string>;
    },
    resolveLoader:{
        alias:PlainObject;
        extensions:Array<string>;
        moduleExtensions:Array<string>;
        modules:Array<string>;
        aliasFields:Array<string>;
        mainFields:Array<string>;
        mainFiles:Array<string>;
    },
    // endregion
    // region output
    output:{
        filename:string;
        hashFunction:string;
        library:string;
        libraryTarget:string;
        path:string;
        publicPath:string;
        umdNamedDefine:boolean;
    },
    target:string;
    // endregion
    module:{
        noParse?:RegExp|Array<RegExp>;
        rules:Array<PlainObject>;
    },
    performance:{
        hints:false|string;
    };
    plugins:Array<Object>;
}
// / endregion
// endregion
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
