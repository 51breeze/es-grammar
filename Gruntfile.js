module.exports=function(grunt){
    grunt.initConfig({
        copy:{
            main: {
                files: [
                    {expand: true, cwd: 'src/syntaxes', src: ['**'], dest: 'build/syntaxes/',filter: 'isFile'},
                    {expand: false, src: ['src/lib-prod.js'], dest: 'build/lib.js', filter: 'isFile'},
                    {expand: false, src: ['src/extension.js'], dest: 'build/extension.js', filter: 'isFile'},
                    {expand: false, src: ['src/service.js'], dest: 'build/service.js', filter: 'isFile'},
                ],
            },
        }
    });
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('default', ['copy']);
}