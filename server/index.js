/* eslint no-console: off, no-process-env: off, no-process-exit: off, no-multi-str: off */
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const util = require('util');

require('babel-register');

const server = require('./main').default;

const mode = process.env.NODE_ENV || 'development';
const appDir = process.env.APP_DIR || path.join(__dirname, '..', 'dist');
const port = process.env.PORT || 5000;
const secretsDir = process.env.SECRETS_DIR || path.join(__dirname, '..');

function readSecret (envar, filename, description, parse) {
  let data = process.env[envar];
  if (!data) {
    const filepath = path.resolve(secretsDir, process.env[`${envar}_FILE`] || filename);
    try {
      data = fs.readFileSync(filepath, 'utf8');
    } catch (err) {
      console.error(
        `could not read ${description} file ${filepath}: [${err.code}] ${err.message}`
      );
      process.exit(1);
    }
  }
  if (parse) {
    try {
      data = JSON.parse(data);
    } catch (err) {
      console.error(`could not parse ${description} data: ${err.message}`);
      process.exit(1);
    }
  }
  return data;
}

server(mode, appDir, process.env)
  .then((cb) => {
    const srv = mode === 'production'
      ? http.createServer(cb)
      : https.createServer({
        key: readSecret('PRIVATE_KEY', 'privkey.pem', 'private key'),
        cert: readSecret('CERTIFICATE_CHAIN', 'fullchain.pem', 'certificate'),
        // following parameters are taken from Mozilla's "Modern" TLS suite
        // https://wiki.mozilla.org/Security/Server_Side_TLS#Modern_compatibility
        ciphers: '\
ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:\
ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:\
ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:\
ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:\
ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:\
!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
        ecdhCurve: 'prime256v1',
        secureProtocol: 'TLSv1_2_method',
      }, cb);
    srv.on('error', handleError);
    return util.promisify(srv.listen.bind(srv))(
      port,
      mode === 'production' ? '0.0.0.0' : 'localhost',
    );
  })
  .then(() => {
    console.log(`server started on port ${port}`);
  })
  .catch(handleError);

function handleError (err) {
  if (mode === 'development') {
    console.error('server: %O', err);
  } else {
    console.error('%s: %s', err.name, err.message);
  }
  process.exit(1);
}
