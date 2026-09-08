import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPack } from '../src/api.js';

test('a lost pack response retries the identical receipt ID', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({url, body:JSON.parse(options.body)});
    if (requests.length === 1) throw new TypeError('Connection lost after commit');
    return new Response(JSON.stringify({pack:{id:'saved-pack',cards:[]},serverTime:Date.now()}), {status:200});
  });
  const result=await requestPack('stable-request-id');
  assert.equal(result.pack.id,'saved-pack');
  assert.equal(requests.length,2);
  assert.deepEqual(requests[0],requests[1]);
});

test('pack allowance rejection does not trigger repeated network calls', async t => {
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(JSON.stringify({error:'No packs left'}),{status:409});});
  await assert.rejects(requestPack('another-request-id'), /No packs left/);
  assert.equal(calls,1);
});
