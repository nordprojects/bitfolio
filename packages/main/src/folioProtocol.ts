import {app, net, protocol} from 'electron';
import * as path from 'node:path';
import * as url from 'node:url'
import { MY_APP_FOLIO_DIR } from './DirWatcher';

export function registerFolioProtocol() {
  // protocol.handle('folio', (request) => {
  //   const filename = new URL(request.url).pathname
  //   const filepath = path.join(MY_APP_FOLIO_DIR, filename);
  //   console.log('folio request', request)
  //   const filesystemRequest = {
  //     // headers: request.headers,
  //     url: url.pathToFileURL(filepath).toString(),
  //   } as Request
  //   console.log('folio request rewrite', filesystemRequest)
  //   return net.fetch(filesystemRequest.url, {headers: request.headers})
  // });
  protocol.registerSchemesAsPrivileged([
    {scheme: 'folio', privileges: {supportFetchAPI: true}},
  ])
  app.on('ready', () => {
    protocol.registerFileProtocol('folio', (request, callback) => {
      const filename = decodeURIComponent(new URL(request.url).pathname)
      console.log('Served file:', filename)
      const filepath = path.join(MY_APP_FOLIO_DIR, filename);
      return callback(filepath)
    })
  })
}
