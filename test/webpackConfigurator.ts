#!/usr/bin/env node
// -*- coding: utf-8 -*-
'use strict'
// region imports
import webpack from 'webpack'

import {WebpackConfiguration} from '../type'
// endregion
// region declarations
declare var expect:Function
declare var test:Function
// endregion
test('webpackConfigurator', ():void => {
    const webpackConfiguration:WebpackConfiguration = require(
        '../webpackConfigurator.compiled'
    ).default
    expect(webpackConfiguration.entry.index).toContain('./index.ts')
    webpackConfiguration.output.path = __dirname
    webpackConfiguration.output.filename = 'dummy.compiled.js'
    expect(webpack(webpackConfiguration)).toBeInstanceOf(Object)
})
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
