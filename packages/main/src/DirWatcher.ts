import * as path from 'node:path';
import {app} from 'electron';
import * as fs from 'node:fs/promises';
import {Mutex} from 'async-mutex';

const APP_SUPPORT_DIR = app.getPath('appData')
const MY_APP_DIR = path.join(APP_SUPPORT_DIR, 'bitfolio')
export const MY_APP_FOLIO_DIR = path.join(MY_APP_DIR, 'folio')

export interface FolioFile {
  name: string;
  mtime: number;
  lastEventTime: number;
}

export default class DirWatcher {
  didUpdate: () => void = () => {};

  lastEventTimes: Record<string, number> = {};

  constructor() {
    console.log(MY_APP_FOLIO_DIR);
    // ensure the directory exists
    fs.mkdir(MY_APP_FOLIO_DIR, {recursive: true});

    this.watcher = this.watch();
    this.watcher.catch(console.error)
  }

  watcher?: Promise<void>;

  async watch() {
    await this.updateIfNeeded()

    for await (const event of fs.watch(MY_APP_FOLIO_DIR)) {
      if (event.filename) {
        this.lastEventTimes[event.filename] = Date.now();
      }
      this.setNeedsUpdate()
    }
  }

  updateTimeout?: NodeJS.Timeout;
  needsUpdate = true;
  updateMutex = new Mutex();
  setNeedsUpdate() {
    if (this.needsUpdate) {
      return
    }

    this.needsUpdate = true;

    this.updateTimeout = setTimeout(() => {
      this.updateIfNeeded();
    }, 50)
  }

  files: FolioFile[] = [];

  async updateIfNeeded() {
    await this.updateMutex.runExclusive(async () => {
      if (!this.needsUpdate) {
        return;
      }
      await this.update();
      this.needsUpdate = false;
    })
  }

  async update() {
    const filenames = await fs.readdir(MY_APP_FOLIO_DIR);
    // populate the files array
    const files: FolioFile[] = await Promise.all(filenames.map(async (name) => {
      const stat = await fs.stat(path.join(MY_APP_FOLIO_DIR, name));
      return {
        name,
        mtime: stat.mtimeMs,
        lastEventTime: this.lastEventTimes[name] ?? stat.mtimeMs,
      };
    }));
    // sort by lastEventTime, latest first
    files.sort((a, b) => b.lastEventTime - a.lastEventTime);
    this.files = files;

    this.didUpdate();
  }
}
