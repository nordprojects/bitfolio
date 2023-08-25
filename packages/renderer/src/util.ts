import type { FolioFile } from '../../main/src/DirWatcher';

export const CONFORM_TAGS = ['1-1', 'fit', 'fill'] as const
export type ConformTag = typeof CONFORM_TAGS[number];

export type FilenameTag = ConformTag | string;

export function getFilenameTags(filename: string): FilenameTag[]  {
  // filename is something.fit.bg-pink.jpg
  // we want to return ['fit', 'bg-pink']
  return filename.split('.').slice(1, -1);
}

export function getConformTag(filename: string): ConformTag | null {
  const tags = getFilenameTags(filename);
  for (const tag of tags) {
    if (CONFORM_TAGS.includes(tag as ConformTag)) {
      console.log(tags);
      return tag as ConformTag;
    }
  }
  return null
}

export function getURLForFile(file: FolioFile) {
  return `folio:///${file.name}`;
}

export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
    const timeout = new Promise<T>((resolve, reject) => {
        setTimeout(
            () => reject(`Timed out after ${millis} ms.`),
            millis
        )
    });
    return Promise.race([
        promise,
        timeout
    ]);
};


export class CancellableTask {
    constructor(runFunc: ((task: CancellableTask) => Promise<void>)) {
        this.cancelPromise = new Promise<void>((resolve, reject) => {
            this.cancelPromiseRejectCallback = reject
        })
        this.cancelPromise.catch(() => {
            // empty catch to prevent unhandled rejection warning
        })

        runFunc(this)
            .catch((error: Error) => {
                if (error.message == 'cancelled') {
                    console.debug('CancellableTask cancelled')
                    return
                } else {
                    console.error(error)
                }
            })
            .finally(() => {
                this._isFinished = true
            })
    }

    isCancelled = false
    _isFinished = false

    cancel() {
        if (!this._isFinished) {
            this.isCancelled = true
            this.cancelPromiseRejectCallback(new Error('cancelled'))
        }
    }

    cancelPromise: Promise<void>
    cancelPromiseRejectCallback!: (error: Error) => void

    yield() {
        this._throwIfCancelled()
    }

    async delay(millis: number) {
        await Promise.race([
            delay(millis),
            this.cancelPromise,
        ])
        this._throwIfCancelled();
    }

    async nextAnimationFrame() {
        await Promise.race([
            new Promise(r => window.requestAnimationFrame(r)),
            this.cancelPromise,
        ])
        this._throwIfCancelled();
    }

    async promise(promise: Promise<any>) {
        await Promise.race([promise, this.cancelPromise])
        this._throwIfCancelled();
    }

    _throwIfCancelled() {
        if (this.isCancelled) {
            throw new Error('cancelled');
        }
    }
}
