var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');

var paths = {
  scripts: ['node_modules/vulpejs/lib/ui/public/javascripts/internal/**/*.js', 'public/javascripts/**/*.js'],
  styles: ['node_modules/vulpejs/lib/ui/public/stylesheets/**/*.css', 'public/stylesheets/**/*.css'],
};

gulp.task('clean-internal-script', function() {
  return del(['public/javascripts/all-internal.min.js']);
});

gulp.task('clean-external-script', function() {
  return del(['public/javascripts/all-external.min.js']);
});

gulp.task('clean-styles', function() {
  return del(['public/stylesheets/all.min.css']);
});

gulp.task('scripts-external', ['clean-external-script'], function() {
  return gulp.src(['node_modules/vulpejs/lib/ui/public/javascripts/external/**/*.js'])
    .pipe(uglify())
    .pipe(concat('all-external.min.js'))
    .pipe(gulp.dest('public/javascripts/'));
});

gulp.task('scripts-internal', ['clean-internal-script'], function() {
  return gulp.src(paths.scripts)
    .pipe(uglify())
    .pipe(concat('all-internal.min.js'))
    .pipe(gulp.dest('public/javascripts/'));
});

gulp.task('styles', ['clean-styles'], function() {
  return gulp.src(paths.styles)
    .pipe(cleanCSS())
    .pipe(concat('all.min.css'))
    .pipe(gulp.dest('public/stylesheets/'));
});

gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
});

gulp.task('default', ['scripts-external', 'scripts-internal', 'styles']);
