var uglify= require('rollup-plugin-uglify');
var resolve = require( 'rollup-plugin-node-resolve' )
var replace = require( 'rollup-plugin-replace' )
var commonjs = require( 'rollup-plugin-commonjs' )
var babel = require( 'rollup-plugin-babel');
const banner = `/*
 * <%= pkg.name %>
 * Copyright © 2017 EaseScript All rights reserved.
 * Released under the MIT license
 * https://github.com/51breeze/es-grammar
 * @author Jun Ye <664371281@qq.com>
 * @date <%= grunt.template.today("yyyy-mm-dd") %>
*/
`;

module.exports=function(grunt){
    grunt.initConfig({
        copy:{
            main: {
                files: [
                    {expand: true, cwd: 'src/syntaxes', src: ['**'], dest: 'lib/syntaxes/',filter: 'isFile'},
                    {expand: true, cwd: '../easescript2/lib/globals', src: ['**'], dest: 'lib/types',filter: 'isFile'},
                ],
            },
        },
        rollup:{
            options: {
                plugins: function() {
                  return [
                    resolve({
                        extensions:['.mjs', '.js']
                    }),
                    commonjs({
                        ignore: ['conditional-runtime-dependency']
                    }),
                    babel({
                        exclude: 'node_modules/**',
                        "presets": [
                            [
                              "@babel/env",
                              {
                                "modules": false
                              }
                            ]
                        ]
                    }),
                    replace({
                        'process.env.NODE_ENV': JSON.stringify('prod'),
                        'process.env.VUE_ENV': JSON.stringify('browser')
                    }),
                    //uglify.uglify()
                  ];
                },
                format: 'cjs',
                external:['vscode','path','fs','events','util'],
            },
            files:{
                src:'./src/extension.js',
                dest:'./lib/extension.js'
            },
        }
        ,pkg: grunt.file.readJSON('package.json'),
        uglify: {
          options: {
            banner:banner,
            //beautify:true,
          },
          build: {
            src: './lib/extension.js',
            dest: './lib/extension.js'
          }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-rollup');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['copy','rollup','uglify']);
}