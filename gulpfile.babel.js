/* eslint no-console: off, no-process-env: off */
import { spawn } from 'child_process';
import del from 'del';
import { config as dotenv } from 'dotenv';
import gulp from 'gulp4';
import path from 'path';
import pump from 'pump';
import named from 'vinyl-named';
import webpack from 'webpack-stream';

dotenv({ path: 'build.properties' });
dotenv();
const { BOOTSTRAP, DEPLOY_PATH } = process.env;

export function clean () {
  return del([
    `${DEPLOY_PATH}/*`,
    `!${DEPLOY_PATH}`,
    `!${DEPLOY_PATH}/.git`,
    `!${DEPLOY_PATH}/dist`,
    `${DEPLOY_PATH}/dist/*`,
    `!${DEPLOY_PATH}/dist/icons-*`,
  ], { dot: true, force: true });
}

export function installBuild () {
  return run('npm', ['install'], { cwd: __dirname });
}

export function linkstuff () {
  return run('npm', ['run', 'linkstuff'], { cwd: __dirname });
}

export function build (cb) {
  pump(
    gulp.src(['app/vendor.js', 'app/entry.js']),
    named(),
    // import of webpack.config.js must not be hoisted above dotenv()
    webpack(require('./webpack.config')), // eslint-disable-line global-require
    gulp.dest(`${DEPLOY_PATH}/dist`),
    cb
  );
}

export function copy (cb) {
  pump(
    gulp.src(
      [
        'server/**', '.gitignore', 'LICENSE', 'package*.json', 'Procfile',
        '.env', '*.pem',
      ],
      { base: __dirname }
    ),
    gulp.dest(DEPLOY_PATH),
    cb
  );
}

export function copyBootstrap (cb) {
  const sourcePath = require.resolve(path.join(BOOTSTRAP, 'bootstrap.min.css'));
  const sourceDir = path.dirname(sourcePath);
  pump(
    gulp.src(sourcePath, { base: sourceDir }),
    gulp.dest(path.join(DEPLOY_PATH, 'server', 'static')),
    cb
  );
}

const defaultTask = gulp.series(
  clean,
  gulp.parallel(
    gulp.series(
      installBuild,
      linkstuff,
      build,
    ),
    copy,
    copyBootstrap,
  ),
);
export { defaultTask as default };

export function installRuntime () {
  return run('npm', ['install', '--production'], { cwd: DEPLOY_PATH });
}

export function herokuLocal () {
  process.on('SIGHUP', () => null)
    .on('SIGINT', () => null)
    .on('SIGTERM', () => null);
  return run('heroku', ['local'], { cwd: DEPLOY_PATH });
}

const localTask = gulp.series(
  clean,
  gulp.parallel(
    gulp.series(
      installBuild,
      linkstuff,
      build,
    ),
    gulp.series(
      copy,
      installRuntime,
    ),
    copyBootstrap,
  ),
  herokuLocal
);
export { localTask as local };

const localNoInstallTask = gulp.series(
  gulp.parallel(
    build,
    copy,
    copyBootstrap,
  ),
  herokuLocal
);
export { localNoInstallTask as localNoInstall };

function run (command, args, options) {
  const child = spawn(command, args, Object.assign({
    stdio: ['ignore', process.stdout, process.stderr],
  }, options || {}));
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => {
      if (code) {
        reject(new Error(`child process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}
