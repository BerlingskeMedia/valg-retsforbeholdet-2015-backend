var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    spawn = require('child_process').spawn;

gulp.task('default', ['api']);

var node;

gulp.task('start_api', function() {
  if (node) {
    node.kill();
  }
  node = spawn('node', ['./api/server.js'], {stdio: 'inherit'});
});

gulp.task('api', ['start_api'], function () {
  gulp.watch(['./api/**.js'], ['start_api']);
});

gulp.task('jshint', function() {
  gulp.src('./api/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
  gulp.src('./sync/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
