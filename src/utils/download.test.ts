import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadBlobFile } from '../lib/download';

test('download helper removes its temporary link and revokes the object URL after the click', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  let clicked = false;
  let removed = false;
  let appended = false;
  let scheduledDelay = 0;
  let scheduledCallback: (() => void) | undefined;
  const revoked: string[] = [];
  const link = {
    href: '',
    download: '',
    style: { display: '' },
    click: () => { clicked = true; },
    remove: () => { removed = true; },
  } as unknown as HTMLAnchorElement;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => link,
      body: { appendChild: () => { appended = true; return link; } },
    } as unknown as Document,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout: (callback: () => void, delay: number) => {
        scheduledCallback = callback;
        scheduledDelay = delay;
        return 1;
      },
    } as unknown as Window,
  });
  URL.createObjectURL = () => 'blob:download-test';
  URL.revokeObjectURL = (url: string) => { revoked.push(url); };

  try {
    downloadBlobFile('records.txt', new Blob(['sample'], { type: 'text/plain' }));

    assert.equal(link.download, 'records.txt');
    assert.equal(link.href, 'blob:download-test');
    assert.equal(appended, true);
    assert.equal(clicked, true);
    assert.equal(removed, true);
    assert.equal(scheduledDelay, 1_000);
    assert.deepEqual(revoked, []);

    scheduledCallback?.();
    assert.deepEqual(revoked, ['blob:download-test']);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete (globalThis as { document?: Document }).document;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as { window?: Window }).window;
  }
});

test('download helper still cleans up when the browser click throws', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let removed = false;
  let scheduledCallback: (() => void) | undefined;
  const revoked: string[] = [];
  const link = {
    href: '',
    download: '',
    style: { display: '' },
    click: () => { throw new Error('browser rejected click'); },
    remove: () => { removed = true; },
  } as unknown as HTMLAnchorElement;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => link,
      body: { appendChild: () => link },
    } as unknown as Document,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { setTimeout: (callback: () => void) => { scheduledCallback = callback; return 1; } } as unknown as Window,
  });
  URL.createObjectURL = () => 'blob:failed-download';
  URL.revokeObjectURL = (url: string) => { revoked.push(url); };

  try {
    assert.throws(() => downloadBlobFile('records.txt', new Blob(['sample'])), /browser rejected click/);
    assert.equal(removed, true);
    scheduledCallback?.();
    assert.deepEqual(revoked, ['blob:failed-download']);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete (globalThis as { document?: Document }).document;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete (globalThis as { window?: Window }).window;
  }
});
