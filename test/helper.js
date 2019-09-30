#!/usr/bin/env node
// @flow
// -*- coding: utf-8 -*-
'use strict'
// region imports
import path from 'path'

import type {BuildConfiguration, Path} from '../type'
import Helper from '../helper.compiled'
// endregion
// region mockup
const buildConfiguration:BuildConfiguration = {
    other: {
        extension: 'other',
        filePathPattern: '',
        outputExtension: 'other'
    },
    javaScript: {
        extension: 'js',
        filePathPattern: '',
        outputExtension: 'js'
    },
    example: {
        extension: 'example',
        filePathPattern: '',
        outputExtension: 'example'
    }
}
// endregion
describe('helper', ():void => {
    // region tests
    // / region boolean
    test.each([
        ['./', ['./'], true],
        ['./', ['../'], true],
        ['../', ['./'], false]
    ])(
        ".isFilePathInLocation('%s', '%s', %p)",
        (filePath:string, locationsToCheck:Array<string>, expected):void =>
            expect(Helper.isFilePathInLocation(filePath, locationsToCheck))
                .toStrictEqual(expected)
    )
    // / endregion
    // / region string
    test.each([
        [
            '',
            null,
            null,
            '',
            '',
            '',
            {},
            {
                content: '<html><head></head><body></body></html>',
                filePathsToRemove: []
            }
        ],
        [
            '<!doctype html><html><head></head><body></body></html>',
            null,
            null,
            '',
            '',
            '',
            {},
            {
                content:
                    '<!doctype html><html><head></head><body></body></html>',
                filePathsToRemove: []
            }
        ]
    ])(
        `
            .inPlaceCSSAndJavaScriptAssetReferences(
                '%s', '%s', '%s', '%s', '%s', '%s', %p)
        `,
        (...parameter:Array<any>):Promise<void> => {
            const expected:any = parameter.pop()
            expect(Helper.inPlaceCSSAndJavaScriptAssetReferences(...parameter))
                .toEqual(expected)
        }
    )
    test.each([
        ['', ''],
        ['a', 'a'],
        ['a!b', 'b'],
        ['aa!b!c', 'c'],
        ['aa!b!c', 'c'],
        ['c?a', 'c'],
        ['aa!b!c?a', 'c'],
        ['aa!b!c?abb?', 'c'],
        ['aa!b!c?abb?a', 'c'],
        ['imports?$=library!moduleName', 'moduleName']
    ])(
        ".stripLoader('%s', '%s')",
        (moduleID:string, expected:string):void =>
            expect(Helper.stripLoader(moduleID)).toStrictEqual(expected)
    )
    // / endregion
    // / region array
    test.each([
        [[], []],
        [['a'], ['a']],
        [['a/'], ['a']],
        [['a/', 'a'], ['a']],
        [['a/', 'a/'], ['a']],
        [['a/', 'a/', 'b/'], ['a', 'b']],
        [['a/', 'a/', 'b'], ['a', 'b']],
        [['a/', 'a/', 'b', '', '.'], ['a', 'b', '.']]
    ])(
        ".normalizePaths(...parameter)",
        (...parameter:Array<string>):void => {
            const expected:string = parameter.pop()
            expect(Helper.normalizePaths(...parameter)).toStrictEqual(expected)
        }
    )
    // / endregion
    // / region file handler
    test.each([
        ['', {}, ''],
        ['a', {}, 'a'],
        ['path', {}, 'path'],
        ['a[name]b', {}, 'a.__dummy__b'],
        ['a[name]b[name]', {}, 'a.__dummy__b.__dummy__'],
        ['a[id]b[hash]', {}, 'a.__dummy__b.__dummy__'],
        ['a[id]b[hash]', {'[id]': 1, '[hash]': 2}, 'a1b2'],
        ['a[id]b[hash]', {'[id]': '[id]', '[hash]': '[hash]'}, 'a[id]b[hash]']
    ])(
        ".renderFilePathTemplate('%s', %p)",
        (template:string, scope:{[key:string]:string}, expected:string):void =>
            expect(Helper.renderFilePathTemplate(template, scope))
                .toStrictEqual(expected)
    )
    test.each([
        ['', ''],
        ['a', 'a'],
        ['a', './', 'a'],
        ['./a', './', './a'],
        ['./a', './', './', './a'],
        ['./a', './a', './', 'a/a'],
        ['./a', './a', './a', './a'],
        ['./a', './a', './a', {a: 'b'}, './a'],
        ['./a', './a/a', './', {a: 'b'}, {}, ['a'], 'b/a']
    ])(".applyContext(...parameter)", (...parameter:Array<any>):void => {
        const expected:string = parameter.pop()
        expect(Helper.applyContext(...parameter)).toStrictEqual(expected)
    })
    test.each([
        ['', ''],
        ['a', 'a'],
        ['path', 'path'],
        ['./helper', null],
        ['./helper', './', null],
        ['./helper', '../', null],
        ['./helper', './a', './helper'],
        ['./helper', './', './', null],
        ['./a', './', './node_modules/a', 'a/a'],
        ['a', './', './', 'a'],
        ['path', './', './', {}, [], 'path'],
        ['path', './', './', {}, [], {path: './main.js'}, './main.js'],
        ['path', './', './', {}, [], {path: 'main.js'}, 'main.js'],
        ['path', './', './', {}, [], {path: './helper.js'}, null],
        ['webpack', 'webpack'],
        ['a', './', './', {}, ['node_modules'], {a$: 'webpack'}, 'webpack'],
        [
            'a',
            './',
            './',
            {a: ['webpack']},
            ['node_modules'],
            {a$: 'webpack'},
            null
        ],
        [
            'a',
            '../',
            './',
            {a: ['not_webpack']},
            ['node_modules'],
            {a$: 'webpack'},
            {},
            {file: {external: [], internal: []}, module: []},
            'webpack'
        ],
        [
            'a',
            '../',
            './',
            {a: ['webpack']},
            ['node_modules'],
            {a$: 'webpack'},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['./'],
            'webpack'
        ],
        [
            'a',
            './',
            './',
            {a: ['webpack']},
            ['node_modules'],
            {a$: 'webpack'},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            null
        ],
        [
            'a',
            './',
            './',
            {a: ['webpack']},
            ['node_modules'],
            {a$: 'webpack'},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            [],
            [],
            [],
            [],
            ['webpack'],
            'webpack'
        ],
        [
            'webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            'webpack'
        ],
        [
            'webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            false,
            'webpack'
        ],
        [
            'webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            true,
            null
        ],
        [
            'a!webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            false,
            null
        ],
        [
            'a!webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            false,
            true,
            null
        ],
        [
            'a!webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.js'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            false,
            false,
            'webpack'
        ],
        [
            'a!webpack',
            './',
            '../',
            {},
            ['node_modules'],
            {},
            {},
            {file: {external: ['.eot'], internal: ['.js']}, module: []},
            './',
            ['.git'],
            ['node_modules'],
            ['main'],
            ['main'],
            [],
            [],
            [],
            false,
            false,
            null
        ]
    ])(
        ".determineExternalRequest(...parameter)",
        (...parameter:Array<any>):void => {
            const expected:null|string = parameter.pop()
            expect(Helper.determineExternalRequest(...parameter))
                .toStrictEqual(expected)
        }
    )
    /*
    this.test('determineAssetType', (assert:Object):void => {
        const paths:Path = {
            apiDocumentation: '',
            base: '',
            configuration: {
                javaScript: null
            },
            context: '',
            source: {
                asset: {
                    base: '',
                    cascadingStyleSheet: '',
                    data: '',
                    font: '',
                    image: '',
                    javaScript: '',
                    source: '',
                    target: '',
                    template: ''
                },
                base: ''
            },
            target: {
                asset: {
                    base: '',
                    cascadingStyleSheet: '',
                    data: '',
                    font: '',
                    image: '',
                    javaScript: '',
                    source: '',
                    target: '',
                    template: ''
                },
                base: '',
                manifest: '',
                public: '',
                target: ''
            },
            ignore: [],
            tidyUp: [],
            tidyUpOnClear: []
        }
        for (const test:Array<any> of [
            [['./', buildConfiguration, paths], null],
            [['a.js', buildConfiguration, paths], 'javaScript'],
            [['a.css', buildConfiguration, paths], null]
        ])
            assert.strictEqual(Helper.determineAssetType(...test[0]), test[1])
    })
    this.test('resolveBuildConfigurationFilePaths', (assert:Object):void => {
        assert.deepEqual(Helper.resolveBuildConfigurationFilePaths({}), [])
        assert.deepEqual(Helper.resolveBuildConfigurationFilePaths(
            buildConfiguration, './', ['.git', 'node_modules']
        ), [
            {
                extension: 'js',
                filePathPattern: '',
                filePaths: [],
                outputExtension: 'js'
            }, {
                extension: 'example',
                filePathPattern: '',
                filePaths: [],
                outputExtension: 'example'
            }, {
                extension: 'other',
                filePathPattern: '',
                filePaths: [],
                outputExtension: 'other'
            }
        ])
    })
    this.test('determineModuleLocations', (assert:Object):void => {
        for (const test:Array<any> of [
            [{}, {filePaths: [], directoryPaths: []}],
            ['example', {filePaths: [], directoryPaths: []}],
            [
                'helper',
                {
                    filePaths: [
                        path.resolve(__dirname, '../helper.js')],
                    directoryPaths: [path.resolve(__dirname, '../')]
                }
            ],
            [{example: 'example'}, {filePaths: [], directoryPaths: []}],
            [
                {example: 'helper'},
                {
                    filePaths: [path.resolve(__dirname, '../helper.js')],
                    directoryPaths: [path.resolve(__dirname, '../')]
                }
            ],
            [
                {helper: ['helper.js']},
                {
                    filePaths: [path.resolve(__dirname, '../', 'helper.js')],
                    directoryPaths: [path.resolve(__dirname, '../')]
                }
            ]
        ])
            assert.deepEqual(Helper.determineModuleLocations(test[0]), test[1])
    })
    this.test('resolveModulesInFolders', (assert:Object):void => {
        for (const test:Array<any> of [
            [{}, {}],
            [{index: []}, {index: []}]
        ])
            assert.deepEqual(Helper.resolveModulesInFolders(test[0]), test[1])
        assert.ok(Helper.resolveModulesInFolders({a: [__dirname]}).a.includes(
            './test/helper.js'))
    })
    this.test('normalizeEntryInjection', (assert:Object):void => {
        for (const test:Array<any> of [
            [[], {index: []}],
            [{}, {index: []}],
            ['example', {index: ['example']}],
            [['example'], {index: ['example']}],
            [{a: 'example'}, {a: ['example']}],
            [{a: ['example']}, {a: ['example']}],
            [{a: ['example'], b: []}, {a: ['example']}],
            [{a: [], b: []}, {index: []}]
        ])
            assert.deepEqual(Helper.normalizeEntryInjection(test[0]), test[1])
    })
    this.test('resolveInjection', (assert:Object):void => {
        for (const test:Array<any> of [
            [
                [
                    {
                        chunks: [],
                        dllChunkNames: [],
                        entry: [],
                        external: []
                    },
                    Helper.resolveBuildConfigurationFilePaths(
                        buildConfiguration, './', ['.git', 'node_modules']
                    ),
                    [],
                    {},
                    {},
                    {file: {external: [], internal: []}, module: []},
                    './',
                    '',
                    ['.git', 'node_modules']
                ],
                {
                    chunks: [],
                    dllChunkNames: [],
                    entry: [],
                    external: []
                }
            ],
            [
                [
                    {
                        chunks: [],
                        dllChunkNames: [],
                        entry: 'a.js',
                        external: []
                    },
                    Helper.resolveBuildConfigurationFilePaths(
                        buildConfiguration, './', ['.git', 'node_modules']
                    ),
                    [],
                    {},
                    {},
                    {file: {external: [], internal: []}, module: []},
                    './',
                    '',
                    ['.git', 'node_modules']
                ],
                {
                    chunks: [],
                    dllChunkNames: [],
                    entry: 'a.js',
                    external: []
                }
            ],
            [
                [
                    {
                        chunks: [],
                        dllChunkNames: [],
                        entry: ['a'],
                        external: []
                    },
                    Helper.resolveBuildConfigurationFilePaths(
                        buildConfiguration, './', ['.git', 'node_modules']
                    ),
                    [],
                    {},
                    {},
                    {file: {external: [], internal: []}, module: []},
                    './',
                    '',
                    ['.git', 'node_modules']
                ],
                {
                    chunks: [],
                    dllChunkNames: [],
                    entry: ['a'],
                    external: []
                }
            ],
            [
                [
                    {
                        chunks: [],
                        dllChunkNames: [],
                        entry: '__auto__',
                        external: []
                    },
                    Helper.resolveBuildConfigurationFilePaths(
                        buildConfiguration, './', ['.git', 'node_modules']
                    ),
                    [],
                    {},
                    {},
                    {file: {external: [], internal: []}, module: []},
                    './',
                    '',
                    ['.git', 'node_modules']
                ],
                {
                    chunks: [],
                    dllChunkNames: [],
                    entry: {},
                    external: []
                }
            ],
            [
                [
                    {
                        chunks: [],
                        dllChunkNames: [],
                        entry: {index: '__auto__'},
                        external: []
                    },
                    Helper.resolveBuildConfigurationFilePaths(
                        buildConfiguration, './', ['.git', 'node_modules']
                    ),
                    [],
                    {},
                    {},
                    {file: {external: [], internal: []}, module: []},
                    './',
                    '',
                    ['.git', 'node_modules']
                ],
                {
                    chunks: [],
                    external: [],
                    entry: {index: []},
                    dllChunkNames: []
                }
            ]
        ])
            assert.deepEqual(Helper.resolveInjection(...test[0]), test[1])
    })
    this.test('getAutoChunk', (assert:Object):void => assert.deepEqual(
        Helper.getAutoChunk(Helper.resolveBuildConfigurationFilePaths(
            buildConfiguration, './', ['.git', 'node_modules']
        ), ['.git', 'node_modules'], './'), {}))
    this.test('determineModuleFilePath', (assert:Object):void => {
        for (const test:Array<any> of [
            [[''], null],
            [['a', {}, {}, {file: [], module: []}, './', '', []], null],
            [['a', {a: 'b'}, {}, {file: [], module: []}, './', '', []], null],
            [
                ['bba', {a: 'b'}, {}, {file: [], module: []}, './', '', []],
                null
            ],
            [['helper'], 'helper.js'],
            [['helper', {}, {}, {file: [], module: []}, './', '', []], null],
            [
                ['./helper', {}, {}, {file: ['.js'], module: []}, '', 'a', []],
                null
            ],
            [
                ['helper', {}, {}, {file: ['.js'], module: []}, './', './'],
                'helper.js'
            ]
        ]) {
            let result:?string = Helper.determineModuleFilePath(...test[0])
            if (result)
                result = path.basename(result)
            assert.strictEqual(result, test[1])
        }
    })
    // / endregion
    this.test('applyAliases', (assert:Object):void => {
        for (const test:Array<any> of [
            ['', {}, ''],
            ['', {a: 'b'}, ''],
            ['a', {}, 'a'],
            ['a', {a: 'b'}, 'b'],
            ['a', {a$: 'b'}, 'b'],
            ['aa', {a$: 'b'}, 'aa'],
            ['bba', {a: 'b'}, 'bbb'],
            ['helper', {}, 'helper']
        ])
            assert.strictEqual(Helper.applyAliases(test[0], test[1]), test[2])
    })
    this.test('applyModuleReplacements', (assert:Object):void => {
        for (const test:Array<any> of [
            ['', {}, ''],
            ['', {a: 'b'}, ''],
            ['a', {}, 'a'],
            ['a', {a: 'b'}, 'b'],
            ['a', {a$: 'b'}, 'b'],
            ['a', {'^a$': 'b'}, 'b'],
            ['aa', {a: 'b'}, 'ba'],
            ['helper', {}, 'helper']
        ])
            assert.strictEqual(
                Helper.applyModuleReplacements(test[0], test[1]), test[2])
    })
    this.test('findPackageDescriptorFilePath', (assert:Object):void => {
        for (const test:Array<any> of [
            ['./', 'package.json'],
            ['./', 'index.js'],
            ['../', 'package.json'],
            ['../', 'index.js']
        ])
            assert.strictEqual(
                Helper.findPackageDescriptorFilePath(test[0], test[1]),
                path.resolve(__dirname, '../', test[1])
            )
    })
    this.test('getClosestPackageDescriptor', (assert:Object):void => {
        for (const test:Array<any> of [
            ['./', 'package.json'],
            ['../', 'package.json']
        ]) {
            const filePath:string = path.resolve(__dirname, '../', test[1])
            assert.deepEqual(
                Helper.getClosestPackageDescriptor(test[0], test[1]),
                {configuration: eval('require')(filePath), filePath}
            )
        }
    })
    */
    // endregion
})
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
