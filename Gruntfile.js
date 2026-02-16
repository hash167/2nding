'use strict';
var LIVERELOAD_PORT = 35729;
var fs = require('fs');
var path = require('path');
var https = require('https');
var url = require('url');
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var mountFolder = function (dir) {
  return require('serve-static')(require('path').resolve(dir));
};

var sendJson = function (res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

var mapTmdbToLegacyMovies = function (results) {
  return (results || []).map(function (movie) {
    var posterPath = movie.poster_path ? 'https://image.tmdb.org/t/p/w185' + movie.poster_path : '/images/poster.jpg';
    return {
      id: String(movie.id || ''),
      title: movie.title || movie.original_title || 'Untitled',
      synopsis: movie.overview || '',
      posters: {
        thumbnail: posterPath,
        profile: posterPath,
        detailed: posterPath,
        original: posterPath
      }
    };
  });
};

var movieApiMiddleware = function (req, res, next) {
  var parsedUrl = url.parse(req.url, true);
  var fallbackPath = path.resolve('app/scripts/in_theaters.json');

  if (parsedUrl.pathname !== '/api/movies/now_playing') {
    return next();
  }

  var serveFallback = function (reason) {
    fs.readFile(fallbackPath, 'utf8', function (err, data) {
      if (err) {
        return sendJson(res, 500, {error: 'Unable to read fallback movie data.'});
      }

      try {
        var parsed = JSON.parse(data);
        parsed.source = 'fallback';
        if (reason) {
          parsed.fallback_reason = reason;
        }
        return sendJson(res, 200, parsed);
      } catch (parseError) {
        return sendJson(res, 500, {error: 'Fallback movie data is invalid JSON.'});
      }
    });
  };

  if (!process.env.TMDB_API_KEY) {
    return serveFallback('TMDB_API_KEY is not set');
  }

  var page = parsedUrl.query.page || '1';
  var tmdbUrl = 'https://api.themoviedb.org/3/movie/now_playing?api_key=' +
    encodeURIComponent(process.env.TMDB_API_KEY) +
    '&language=en-US&page=' + encodeURIComponent(page);

  https.get(tmdbUrl, function (tmdbRes) {
    var raw = '';
    tmdbRes.setEncoding('utf8');
    tmdbRes.on('data', function (chunk) { raw += chunk; });
    tmdbRes.on('end', function () {
      if (tmdbRes.statusCode >= 400) {
        return serveFallback('TMDB request failed with status ' + tmdbRes.statusCode);
      }

      try {
        var parsed = JSON.parse(raw);
        return sendJson(res, 200, {
          total: parsed.total_results || 0,
          movies: mapTmdbToLegacyMovies(parsed.results),
          source: 'tmdb'
        });
      } catch (err) {
        return serveFallback('TMDB response could not be parsed');
      }
    });
  }).on('error', function () {
    return serveFallback('TMDB request failed');
  });
};

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // configurable paths
  var yeomanConfig = {
    app: 'app',
    dist: 'dist'
  };

  grunt.initConfig({
    yeoman: yeomanConfig,
    watch: {
      options: {
        nospawn: true,
        livereload: { liveCSS: false }
      },
      livereload: {
        options: {
          livereload: true
        },
        files: [
          '<%= yeoman.app %>/*.html',
          '<%= yeoman.app %>/elements/{,*/}*.html',
          '{.tmp,<%= yeoman.app %>}/elements/{,*/}*.css',
          '{.tmp,<%= yeoman.app %>}/styles/{,*/}*.css',
          '{.tmp,<%= yeoman.app %>}/scripts/{,*/}*.js',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      },
      js: {
        files: ['<%= yeoman.app %>/scripts/{,*/}*.js'],
        tasks: ['jshint']
      },
      styles: {
        files: [
          '<%= yeoman.app %>/styles/{,*/}*.css',
          '<%= yeoman.app %>/elements/{,*/}*.css'
        ],
        tasks: ['copy:styles', 'autoprefixer:server']
      }
    },
    autoprefixer: {
      options: {
        browsers: ['last 2 versions']
      },
      server: {
        files: [{
          expand: true,
          cwd: '.tmp',
          src: '**/*.css',
          dest: '.tmp'
        }]
      },
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: ['**/*.css', '!bower_components/**/*.css'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },
    connect: {
      options: {
        port: 9000,
        // change this to '0.0.0.0' to access the server from outside
        hostname: 'localhost'
      },
      livereload: {
        options: {
          middleware: function () {
            return [
              lrSnippet,
              movieApiMiddleware,
              mountFolder('.tmp'),
              mountFolder(yeomanConfig.app)
            ];
          }
        }
      },
      test: {
        options: {
          open: {
            target: 'http://localhost:<%= connect.options.port %>/test'
          },
          middleware: function () {
            return [
              mountFolder('.tmp'),
              movieApiMiddleware,
              mountFolder(yeomanConfig.app)
            ];
          },
          keepalive: true
        }
      },
      dist: {
        options: {
          middleware: function () {
            return [
              mountFolder(yeomanConfig.dist)
            ];
          }
        }
      }
    },
    open: {
      server: {
        path: 'http://localhost:<%= connect.options.port %>'
      }
    },
    clean: {
      dist: ['.tmp', '<%= yeoman.dist %>/*'],
      server: '.tmp'
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        '<%= yeoman.app %>/scripts/{,*/}*.js',
        '!<%= yeoman.app %>/scripts/vendor/*',
        'test/spec/{,*/}*.js'
      ]
    },
    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>'
      }
    },
    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
      options: {
        dirs: ['<%= yeoman.dist %>'],
        blockReplacements: {
          vulcanized: function (block) {
            return '<link rel="import" href="' + block.dest + '">';
          }
        }
      }
    },
    vulcanize: {
      default: {
        options: {
          strip: true
        },
        files: {
          '<%= yeoman.dist %>/elements/elements.vulcanized.html': [
            '<%= yeoman.dist %>/elements/elements.html'
          ]
        }
      }
    },
    cssmin: {
      main: {
        files: {
          '<%= yeoman.dist %>/styles/main.css': [
            '.tmp/concat/styles/{,*/}*.css'
          ]
        }
      },
      elements: {
        files: [{
          expand: true,
          cwd: '.tmp/elements',
          src: '{,*/}*.css',
          dest: '<%= yeoman.dist %>/elements'
        }]
      }
    },
    minifyHtml: {
      options: {
        quotes: true,
        empty: true,
        spare: true
      },
      app: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: '*.html',
          dest: '<%= yeoman.dist %>'
        }]
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{ico,txt}',
            '.htaccess',
            '*.html',
            'elements/**',
            '!elements/**/*.css',
            'images/{,*/}*.{webp,gif}',
            'bower_components/**'
          ]
        }]
      },
      styles: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>',
          dest: '.tmp',
          src: ['{styles,elements}/{,*/}*.css']
        }]
      }
    },
    // See this tutorial if you'd like to run PageSpeed
    // against localhost: http://www.jamescryer.com/2014/06/12/grunt-pagespeed-and-ngrok-locally-testing/
    pagespeed: {
      options: {
        // By default, we use the PageSpeed Insights
        // free (no API key) tier. You can use a Google
        // Developer API key if you have one. See
        // http://goo.gl/RkN0vE for info
        nokey: true
      },
      // Update `url` below to the public URL for your site
      mobile: {
        options: {
          url: "https://developers.google.com/web/fundamentals/",
          locale: "en_GB",
          strategy: "mobile",
          threshold: 80
        }
      }
    }
  });

  grunt.registerTask('server', function (target) {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve:' + target]);
  });

  grunt.registerTask('serve', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'open', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'copy:styles',
      'autoprefixer:server',
      'connect:livereload',
      'open',
      'watch'
    ]);
  });

  grunt.registerTask('test', 'Legacy project has no runnable automated tests.', function () {
    grunt.log.ok('No automated tests configured.');
  });
  grunt.registerTask('test:browser', ['connect:test']);
  grunt.registerTask('test:remote', 'Legacy project has no runnable remote tests.', function () {
    grunt.log.ok('No remote tests configured.');
  });

  grunt.registerTask('build', [
    'clean:dist',
    'copy',
    'useminPrepare',
    'concat',
    'autoprefixer',
    'uglify',
    'cssmin',
    'vulcanize',
    'usemin',
    'minifyHtml'
  ]);

  grunt.registerTask('default', [
    'jshint',
    // 'test'
    'build'
  ]);
};
