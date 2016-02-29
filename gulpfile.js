var gulp = require('gulp');
var connect = require('gulp-connect');
var useref = require('gulp-useref');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var cssnano = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var rimraf = require('gulp-rimraf');
var yaml = require('yamljs');
var template = require('gulp-template');
var data = require('gulp-data');
var changed = require('gulp-changed');
var path = require('path');
var spawn = require('child_process').spawnSync;
var newer = require('gulp-newer');
var rename = require('gulp-rename');
var less = require('gulp-less');
var through = require('through2');
var fs = require('fs');

gulp.task('connect', function () {
    connect.server({
        root: 'dist',
        port: 5000,
        livereload: true
    });
});

gulp.task('watch', function () {
    gulp.watch(['*.html', '*.yml'], [ 'html' ]);
    gulp.watch('less/*.less', [ 'less' ]);
    gulp.watch('img/**/*', [ 'img' ]);
    gulp.watch('js/**/*', copyFiles);
});

gulp.task('clean', function () {
    gulp.src('dist', { read: false }).pipe(rimraf());
    gulp.src('qrsync.json', { read: false }).pipe(rimraf());
});

gulp.task('html', function () {
    gulp.src('index.html').pipe(data(function (file, cb) {
        yaml.load(path.basename(file.path).split('.')[0] + '.yml', function (result) {
            cb(undefined, result);
        });
    })).pipe(template()).pipe(gulp.dest('dist')).pipe(connect.reload());
});


gulp.task('less', function () {
    gulp.src('less/*.less').pipe(less()).pipe(gulp.dest('dist/css/')).pipe(connect.reload());
});

gulp.task('build', function () {
    gulp.src('./*.html').pipe(useref()).pipe(gulpif('*.js', uglify())).pipe(gulpif('*.css', cssnano())).pipe(gulp.dest('dist'));
    ['font-awesome/fonts/', 'font-awesome/css/', 'fonts/'].forEach(function (dir) {
        gulp.src(dir + '**/*').pipe(gulp.dest('dest/' + dir));
    });
});

gulp.task('img', function () {
    gulp.src('img/**/*').pipe(changed('dist/img')).pipe(imagemin({
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngquant()]
    })).pipe(gulp.dest('dist/img')).pipe(connect.reload());
});

var copyFiles = function () {
    // copy files
    ['font-awesome/fonts/', 'font-awesome/css/', 'fonts/', 'css/', 'js/'].forEach(function (dir) {
        gulp.src(dir + '**/*').pipe(changed('dist/' + dir)).pipe(gulp.dest('dist/' + dir));
    });
};

gulp.task('buildDev', ['html', 'less', 'img'], copyFiles);

gulp.task('default', ['connect', 'watch']);

gulp.task('qrsyncConf', function () {
    gulp.src('./qiniu-conf.json').pipe(newer('./qrsync.json')).pipe(through.obj(function (chunk, enc, cb) {
        var qiniuConf = JSON.parse(chunk.contents.toString());
        chunk.contents = new Buffer(JSON.stringify({
                src: "./dist",
                dest: `qiniu:access_key=${qiniuConf.accessKey}&secret_key=${qiniuConf.secretKey}&bucket=${qiniuConf.bucket}`,
                prefetch: 0,
                debug_level: 1
        }));
        cb(null, chunk);
    })).pipe(rename('qrsync.json')).pipe(gulp.dest('./'));
});

gulp.task('sync', ['qrsyncConf'], function () {
    spawn('qrsync-v2', ['qrsync.json']);
});

gulp.task('refresh', function () {
    fs.readdir('./dist', function (err, paths) {
        var qiniuConf = require('./qiniu-conf.json');
        var paths = paths.filter(function (path_) {
            return path.extname(path_) === '.html';
        });
        console.log(paths.join(',') + ' will be refreshed');
        var args = ['cdn/refresh', qiniuConf.bucket].concat(paths.map(function (path_) {
            return `http://${qiniuConf.domain}/index.html`;
        }));
        spawn('qrsctl', args);
    });
});

gulp.task('ship', ['sync', 'refresh']);
