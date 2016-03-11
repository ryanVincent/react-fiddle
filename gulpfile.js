var gulp = require('gulp');
var less = require('gulp-less');
var browserify = require('browserify');
var watchify = require('watchify');
var reactify = require('reactify');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var path = require('path');
var plumber = require('gulp-plumber');
var watch = require('gulp-watch');
var lint = require('gulp-eslint');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var browserSync = require("browser-sync").create();
var duration = require('gulp-duration');
var gulpif = require('gulp-if');
var babelify = require('babelify');
var envify = require('envify/custom');

var config = {
    paths: {
        html: '',
        js: [
            './src/**/*.js',
        ],
        css: [
            './Prologue.WebApp/Content/bootstrap/bootstrap.less',
            './Prologue.WebApp/Content/styles/prologue.less',
            './Prologue.WebApp/Content/styles/custom-themes/skin-prologue-light.less',
            './Prologue.WebApp/Content/themes/AdminLTE/AdminLTE.less'
        ],
        cssSrc: [
            './Prologue.WebApp/Content/**/*.less'
        ],
        dist: {
            js: './build/js',
            css: './build/css'
        },
        mainJs: [
            './Prologue.WebApp/app/actionPlans/actionPlans.js',
        ]
    },
    appDependencies: [
        'lodash',
        'moment',
        'react',
        'react-dom',
        'react-router'
    ];
};

function lintApp(options) {
    return gulp.src(config.paths.js)
        .pipe(lint({ config: './eslint.config.json', fix: false }))
        .pipe(lint.format())
        .pipe(gulpif(!options.development, lint.failAfterError()));
    }

function bundleApp(options) {

    process.env.NODE_ENV = options.development ? 'dev' : 'production';

    var makeAppBundler = function(glob) {
        var dest = path.join(config.paths.dist.js);

        // typically the main entry point for a module is index.js, not a great name when we're bundling, so...
        // we assume the containing folder for the module name
        var appFile = path.dirname(glob).split('/').pop() + '.js';

        var appBundler = browserify({
            debug: true, // It is nice to have sourcemapping when developing
            entries: [glob],
            debug: options.development,
            cache: {},
            packageCache: {},
            fullPaths: true
        })
        .transform(babelify.configure({ presets: ['es2015', 'react'] }))
        .transform(envify({ _: 'purge', NODE_ENV: options.development ? 'development' : 'production' }))

        appBundler.external(config.appDependencies);

        var rebundle = function () {
            console.log('Building APP bundle: ', path.join(dest, appFile));
            var bundleTimer = duration('Javascript bundle time');

            appBundler.bundle()
                .on('error', gutil.log)
                .pipe(source(appFile))
                .pipe(gulpif(!options.development, buffer()))
                .pipe(gulpif(!options.development, uglify()))
                .pipe(gulp.dest(dest))
                .pipe(bundleTimer) // Output time timing of the file creation;
                .on('end', function() {
                    if(options.development && options.reloadBrowser) {
                        browserSync.reload();
                    }
                });
        };

        if (options.development && options.watch) {
            appBundler = watchify(appBundler);
            appBundler.on('update', function() {
                rebundle();
            });
        }

        rebundle();
    }

    config.paths.mainJs.map(function(glob) {
        makeAppBundler(glob);
    });

    var vendorsBundler = browserify({
        debug: true, // It is nice to have sourcemapping when developing
        require: config.appDependencies
    });

    console.log('Building VENDORS bundle: ', path.join(config.paths.dist.js, 'vendors.js'));
    var vendorBundleTimer = duration('vendor bundle time');
    vendorBundleTimer.start;

    return vendorsBundler.bundle()
        .on('error', gutil.log)
        .pipe(source('vendors.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest(config.paths.dist.js))
        .pipe(vendorBundleTimer);

    if (options.development && options.watch) {
        console.log(' -- watching for file changes');
    }
}

gulp.task('js-dev', function(){
    var options = { development: true, watch: true, reloadBrowser: true };
    if(process.env.DEV_WATCH_FILES !== undefined) {
        options.watch = process.env.DEV_WATCH_FILES !== 'false';
    }
    if(process.env.DEV_RELOAD_BROWSER !== undefined) {
        options.reloadBrowser = process.env.DEV_RELOAD_BROWSER !== 'false';
    }

    return bundleApp(options);
});

gulp.task('js-prod', function(){
  return bundleApp({ development: false });
});

gulp.task('lint', function() {
    return lintApp({ development: true });
});

gulp.task('lint-prod', function() {
    return lintApp({ development: false });
});

gulp.task('less', function () {
    return gulp.src(config.paths.css)
    .pipe(plumber())
      .pipe(less())
        .pipe(gulp.dest(config.paths.dist.css));
});

gulp.task('lint-legacy', function () {
    return gulp.src('./Prologue.WebApp/Scripts/custom/*.js')
      .pipe(lint({config: 'eslint.config.json'}))
      .pipe(lint.format());
});

gulp.task('watch', ['lint', 'less', 'js-dev'], function () {
    gulp.watch(config.paths.cssSrc, ['less']);
    gulp.watch(config.paths.js, ['lint']);
});


gulp.task('serve', function() {
  browserSync.init({
    proxy: "localhost:1679",
    browser: "chrome"
  });
});

gulp.task('default', ['watch', 'serve'])
