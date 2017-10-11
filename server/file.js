/* eslint callback-return: off */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import resolvePath from 'resolve-path';
import util from 'util';

const open = util.promisify(fs.open);
const fstat = util.promisify(fs.fstat);
const close = util.promisify(fs.close);
const readFile = util.promisify(fs.readFile);

export function serve (basePath, userOptions) {
  const options = Object.assign({
    cacheControl: 'public',
    maxCache: 4096,
    stem: '',
  }, userOptions || {});
  const root = path.normalize(path.resolve(basePath));
  const stemRegex = options.stem === '' || options.stem === '/'
    ? /^\/(.*)/
    : new RegExp(`^${options.stem.replace(/\W/, '\\$&')}(?:/|$)(.*)`);

  let indexPath = null;
  if (options.indexFile) {
    indexPath = resolvePath(root, options.indexFile);
  }

  const cache = {};

  return async (ctx, next) => {
    if (handleOptions(ctx)) {
      // truthy return value means OPTIONS method has been handled
      // falsy means to go ahead and handle GET or HEAD
      // other methods cause it to throw an exception
      return;
    }

    if (!options.hidden) {
      for (let p = ctx.path; p.length > 1; p = path.dirname(p)) {
        const basename = path.basename(p);
        if (basename.startsWith('.') && basename !== '.well-known') {
          ctx.throw(400);
        }
      }
    }

    const stemmed = stemRegex.exec(ctx.path);
    if (!stemmed || (!stemmed[1] && !indexPath)) {
      if (options.fallthru) {
        await next();
        return;
      }
      ctx.throw(404);
    }

    const tryPaths = [];
    if (stemmed[1]) {
      const filePath = resolvePath(root, stemmed[1]);
      tryPaths.push(filePath);
      if (!path.extname(filePath) && options.extensions) {
        tryPaths.push(...options.extensions.map((ext) => `${filePath}.${ext}`));
      }
    }
    if (indexPath) {
      tryPaths.push(indexPath);
    }

    let body = null;
    let result = null;
    let filePath = null;
    let fileType = null;
    for (const p of tryPaths) {
      filePath = p;
      fileType = path.extname(p).substr(1);
      if (cache[p]) {
        result = cache[p];
        body = result.contents;
        break;
      }
      let fd = null;
      try {
        fd = await open(p, 'r'); // eslint-disable-line no-await-in-loop
        const stats = await fstat(fd); // eslint-disable-line no-await-in-loop
        const { mtime, size } = stats;
        if (size > options.maxCache) {
          body = fs.createReadStream(null, { fd });
          // the stream is now responsible for closing fd
          fd = null;
          const etag = `W/"${size.toString(16)}-${mtime.getTime().toString(16)}"`;
          result = { size, mtime, etag };
          break;
        }
        body = await readFile(fd); // eslint-disable-line no-await-in-loop
        // body is now a Buffer
        close(fd)
          .catch((err2) => {
            process.emitWarning(err2);
          });
        fd = null;
        const digester = crypto.createHash('sha256');
        digester.update(body);
        // eslint-disable-next-line no-div-regex
        const hash = digester.digest('base64').replace(/=+$/, '');
        const etag = `"${size.toString(16)}-${hash}"`;
        result = cache[filePath] = { size, mtime, etag, contents: body };
        break;
      } catch (err) {
        if (typeof fd === 'number') {
          close(fd)
            .catch((err2) => {
              process.emitWarning(err2);
            });
        }
        if (!['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'].includes(err.code)) {
          err.statusCode = 500;
          throw err;
        }
      }
    }
    if (!result) {
      if (options.fallthru || options.fallthrough) {
        await next();
        return;
      }
      ctx.throw(404);
    }

    ctx.lastModified = result.mtime || new Date();
    ctx.length = result.size;
    ctx.type = fileType;
    if (result.etag) {
      ctx.etag = result.etag;
    }
    const ctrl = typeof options.cacheControl === 'function'
      ? options.cacheControl(ctx, filePath === indexPath)
      : options.cacheControl;
    if (ctrl) {
      ctx.set('Cache-Control', ctrl);
    }

    ctx.status = 200; // ctx.fresh requires status of 200 or 304 to be set before checking?
    if (ctx.fresh) {
      ctx.status = 304;
    } else if (ctx.method === 'GET') {
      ctx.body = body;
    }
  };
}

export function serveOneFile (filePath, userOptions) {
  const options = Object.assign({
    cacheControl: 'public',
  }, userOptions || {});

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error('can only serve regular files');
  }
  const contents = fs.readFileSync(filePath);

  const hash = crypto
    .createHash('md5')
    .update(contents)
    .digest('base64')
    .replace(/=+$/, ''); // eslint-disable-line no-div-regex
  const len = contents.length;
  const etag = `"${len.toString(16)}-${hash}"`;
  const lastModified = stats.mtime;
  const fileType = path.extname(filePath);

  return async (ctx) => { // eslint-disable-line require-await
    if (handleOptions(ctx)) {
      return;
    }
    checkAccepts(ctx, fileType);

    ctx.lastModified = lastModified;
    ctx.length = len;
    ctx.type = fileType;
    ctx.etag = etag;
    ctx.set('Cache-Control', options.cacheControl);

    ctx.status = 200; // ctx.fresh requires status of 200 or 304 to be set before checking?
    if (ctx.fresh) {
      ctx.status = 304;
    } else if (ctx.method === 'GET') {
      ctx.body = contents;
    }
  };
}

function handleOptions (ctx) {
  if (ctx.method === 'OPTIONS') {
    ctx.set('Allow', 'GET,HEAD,OPTIONS');
    ctx.body = null;
    ctx.status = 200;
    return true;
  }
  if (['GET', 'HEAD'].includes(ctx.method)) {
    return false;
  }
  const e = new Error('Not Allowed');
  e.statusCode = 405;
  e.headers = { Allow: 'GET,HEAD,OPTIONS' };
  e.expose = false;
  throw e;
}

function checkAccepts (ctx, fileType) {
  if (!ctx.accepts(fileType) || !ctx.acceptsEncoding('identity')
      || !ctx.acceptsLanguages('en') || !ctx.acceptsCharsets('utf-8')) {
    ctx.throw(406);
  }
}
