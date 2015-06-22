module.exports = (grunt) ->

  require('load-grunt-tasks')(grunt)

  grunt.initConfig
    pkg:
      grunt.file.readJSON 'package.json'

    coffee:
      options:
        sourceMap: false
      compile:
        files:
          'dist/leaflet.timeline.js': [
            'src/intervaltree.coffee'
            'src/timeline.coffee'
            'src/timeline.controls.coffee'
          ]

    coffeelint:
      options:
        "no_backticks":
          "level": "ignore"
      lib:
        files:
          src: ["src/*.coffee"]

    sass:
      options:
        sourceMap: true
      dist:
        files:
          'dist/leaflet.timeline.css': 'src/leaflet.timeline.sass'

    watch:
      sass:
        files: ["src/*.sass"]
        tasks: ["sass"]
      coffee:
        files: ["src/*.coffee"]
        tasks: ["coffeelint", "coffee"]

  grunt.registerTask('default', ['sass', 'coffee']);
  grunt.registerTask('dist', ['sass', 'coffee']);
