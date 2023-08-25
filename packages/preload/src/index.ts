/**
 * @module preload
 */

import type {FolioFile} from '../../main/src/DirWatcher';

let fileList: FolioFile[] = [];
const fileListUpdateCallbacks = new Array<(files: FolioFile[]) => void>();
export function getFileList() {
  return fileList.slice();
}
export function onFileListUpdate(callback: (files: FolioFile[]) => void) {
  fileListUpdateCallbacks.push(callback);
  callback(fileList);
  return () => {
    const index = fileListUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      fileListUpdateCallbacks.splice(index, 1);
    }
  }
}

import {ipcRenderer} from 'electron';

ipcRenderer.on('files', (event, files: FolioFile[]) => {
  fileList = files;
  for (const callback of fileListUpdateCallbacks) {
    callback(fileList);
  }
})

ipcRenderer.send('request-files');

