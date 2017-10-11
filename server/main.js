/* eslint callback-return: off */
import Koa from 'koa';
import crypto from 'crypto';
import dateformat from 'dateformat';
import enforceHttps from 'koa-sslify';
import fs from 'fs';
import helmet from 'koa-helmet';
import http from 'http';
import json from 'koa-json';
import morgan from 'koa-morgan';
import nunjucks from 'nunjucks';
import path from 'path';
import util from 'util';

import { serve } from './file';

const SIX_MONTHS = 15768000; // seconds in 182 days
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const TITLE = 'Sosostris';

const INTEGRITY = {};
const ALGORITHM = 'sha384';
fs.readdirSync(path.join(__dirname, 'static')).forEach((filename) => {
  if (/\.(?:js|css)$/.test(filename)) {
    const hash = crypto.createHash(ALGORITHM);
    hash.update(fs.readFileSync(path.join(__dirname, 'static', filename)));
    INTEGRITY[filename] = `${ALGORITHM}-${hash.digest('base64')}`;
  }
});

// eslint-disable-next-line require-await
export default async function server (mode, appDir, secrets) {
  const app = new Koa();
  app.name = TITLE.toLowerCase();
  app.proxy = mode === 'production';

  const keys = [Buffer.from(secrets.KOA_SECRET, 'base64')];
  app.keys = keys;

  const nunjucksEnvironment = nunjucks.configure(TEMPLATE_DIR);
  nunjucksEnvironment.addFilter('dateformat', dateformat);
  app.context.render = util.promisify(nunjucksEnvironment.render.bind(nunjucksEnvironment));

  app.use(morgan('combined'));

  if (mode === 'production') {
    app.use(enforceHttps({
      trustProtoHeader: true,
      redirectMethods: ['GET', 'HEAD'],
      internalRedirectMethods: [/* 'PATCH', 'POST', 'PUT', 'DELETE' */],
      specCompliantDisallow: true,
    }));
  }

  const helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        // connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        manifestSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      },
      browserSniff: false,
    },
  };
  if (mode === 'production') {
    helmetOptions.hsts = { maxAge: SIX_MONTHS, preload: true };
    helmetOptions.contentSecurityPolicy.directives.reportUri
      = 'https://metalfatigue.report-uri.io/r/default/csp/enforce';
  } else {
    helmetOptions.hsts = false;
    helmetOptions.contentSecurityPolicy.directives.reportUri
      = 'https://metalfatigue.report-uri.io/r/default/csp/reportOnly';
    helmetOptions.contentSecurityPolicy.reportOnly = true;
  }
  app.use(helmet(helmetOptions));

  app.use(json({ pretty: false, param: 'pretty' }));

  app.use(handleError(mode));

  app.use(serve(path.join(__dirname, 'static'), {
    fallthru: true,
    maxCache: 20480,
    cacheControl (ctx) {
      let header = 'public';
      if (mode === 'production' && ctx.path.startsWith('/tarot/')) {
        header += `, max-age=${SIX_MONTHS}`; // , immutable
      } else {
        header += ', max-age=3600';
      }
      if (/\.(?:js|css)$/.test(ctx.path)) {
        header += ', no-transform';
      }
      return header;
    },
  }));

  app.use(serve(appDir, {
    indexFile: 'index.html',
    maxCache: -1,
    cacheControl (ctx, isIndex) {
      let header = isIndex ? 'private' : 'public';
      if (mode === 'production'
          && (/[^/.]\.[0-9A-Fa-f]{8,}\.[^/.]+$/.test(ctx.path)
              || /\/icons-[0-9A-Fa-f]{8,}\//.test(ctx.path))) {
        header += `, max-age=${SIX_MONTHS}`; // , immutable
      } else {
        header += ', max-age=60';
      }
      if (/\.(?:js|css)$/.test(ctx.path)) {
        header += ', no-transform';
      }
      return header;
    },
  }));

  return app.callback();
}

function handleError (mode) {
  return async (ctx, next) => {
    try {
      await next();
      if (ctx.response.status === 404 && !ctx.response.body) {
        ctx.throw(505);
      }
    } catch (err) {
      if (err.isBoom) {
        err.statusCode = err.output.statusCode;
        err.headers = err.output.headers;
        err.expose = !err.isServer;
      }
      if (err.statusCode) {
        ctx.status = err.statusCode;
      } else if (err.status) {
        ctx.status = err.statusCode = err.status;
      } else if (ctx.status) {
        err.statusCode = ctx.status;
      } else {
        ctx.status = err.statusCode = 500;
      }
      ctx.response.set(err.headers || {});
      if (mode === 'production') {
        if (typeof err.expose === 'undefined') {
          err.expose = err.statusCode < 500;
        }
      } else {
        err.expose = true;
      }
      const message = (err.expose && err.message) || http.STATUS_CODES[err.statusCode];
      const detail = err.expose && err.detail;
      switch (ctx.accepts('html', 'json', 'text/plain')) {
      case 'html':
        ctx.type = 'text/html';
        ctx.body = await ctx.render('error.njk', {
          statusCode: err.statusCode,
          code: err.expose && err.code,
          message,
          detail,
          INTEGRITY,
          TITLE,
        });
        break;
      case 'json':
        ctx.type = 'application/json';
        // eslint-disable-next-line camelcase
        ctx.body = { error_description: message, status: err.statusCode };
        if (err.code && err.expose) {
          ctx.body.error = err.code;
        }
        break;
      default:
        ctx.type = 'text/plain';
        ctx.body = `Error ${err.statusCode}: `;
        if (err.code && err.expose) {
          ctx.body += `[${err.code}] `;
        }
        ctx.body += `${message}\n`;
        if (detail) {
          ctx.body += `${detail}\n`;
        }
      }
    }
  };
}
