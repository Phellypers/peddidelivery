import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { storageConfigured, uploadImage, StorageUploadError } from '../src/modules/storage/client.js';
import { env } from '../src/config/env.js';
import { app } from '../src/app.js';
import { createAccessToken } from '../src/auth/tokens.js';

const settings={supabaseUrl:'https://storage-test.supabase.co',supabaseStorageBucket:'peddi-images',supabaseStorageKey:'sb_secret_test_only'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');

test('Storage envia bytes pelo backend sem usar a chave secreta como JWT',async()=>{
  assert.equal(storageConfigured(settings),true);
  assert.equal(storageConfigured({...settings,supabaseStorageKey:'sb_publishable_test_only'}),false);
  assert.equal(storageConfigured({...settings,supabaseUrl:'https://example.com'}),false);
  const url=await uploadImage(png,'stores/store/users/user/image.png','image/png',settings,async(input,init)=>{
    assert.equal(input,'https://storage-test.supabase.co/storage/v1/object/peddi-images/stores/store/users/user/image.png');
    const headers=new Headers(init?.headers);
    assert.equal(headers.get('apikey'),settings.supabaseStorageKey);
    assert.equal(headers.has('Authorization'),false);
    assert.equal(headers.get('Content-Type'),'image/png');
    assert.equal(headers.get('x-upsert'),'false');
    assert.deepEqual(Buffer.from(init?.body as Uint8Array),png);
    assert.equal(init?.redirect,'error');
    return Response.json({Key:'peddi-images/stores/store/users/user/image.png'});
  });
  assert.equal(url,'https://storage-test.supabase.co/storage/v1/object/public/peddi-images/stores/store/users/user/image.png');
  for(const status of [401,403,404,413,500]){
    await assert.rejects(uploadImage(png,'test.png','image/png',settings,async()=>Response.json({message:settings.supabaseStorageKey},{status})),
      (error:unknown)=>error instanceof StorageUploadError && !error.message.includes(settings.supabaseStorageKey));
  }
  await assert.rejects(uploadImage(png,'test.png','image/png',settings,async()=>{throw Error('private provider details');}),
    (error:unknown)=>error instanceof StorageUploadError && !error.message.includes('private provider details'));
});

test('upload online exige login e grava apenas na pasta do usuario e loja do token',async()=>{
  const original={demo:env.demoMode,mvp:env.mvpMode,url:env.supabaseUrl,key:env.supabaseStorageKey,bucket:env.supabaseStorageBucket};
  env.demoMode=false;env.mvpMode=true;
  Object.assign(env,settings);
  const realFetch=globalThis.fetch;
  const user=crypto.randomUUID(),store=crypto.randomUUID();
  let writes=0;
  globalThis.fetch=async(input,init)=>{
    if(String(input).startsWith(settings.supabaseUrl)){
      writes++;
      assert.match(String(input),new RegExp(`/stores/${store}/users/${user}/[a-f0-9-]+\\.png$`));
      assert.equal(new Headers(init?.headers).get('Authorization'),null);
      return Response.json({Key:'saved'});
    }
    return realFetch(input,init);
  };
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const route=`http://127.0.0.1:${address.port}/api/v1/demo/upload`;
  const token=(role='manager',storeId:string|null=store)=>createAccessToken({id:user,email:'test@peddi.local',name:'Test',role,businessId:crypto.randomUUID(),storeId});
  const call=(body:Buffer,type='image/png',access:string|null=token())=>realFetch(route,{
    method:'POST',headers:{'Content-Type':type,...(access?{Authorization:`Bearer ${access}`}:{})},body:new Uint8Array(body),
  });
  try{
    assert.equal((await call(png,'image/png',null)).status,401);
    assert.equal((await call(png,'image/png',token('invalid'))).status,403);
    assert.equal((await call(png,'image/png',token('manager',null))).status,403);
    assert.equal((await call(Buffer.from('<svg></svg>'),'image/png')).status,400);
    assert.equal((await call(png,'image/jpeg')).status,400);
    assert.equal(writes,0);
    const saved=await call(png);
    assert.equal(saved.status,201);
    const result=await saved.json();
    assert.match(result.file_url,new RegExp(`/object/public/peddi-images/stores/${store}/users/${user}/`));
    assert.equal(JSON.stringify(result).includes(settings.supabaseStorageKey),false);
    assert.equal(writes,1);
  }finally{
    globalThis.fetch=realFetch;
    Object.assign(env,{demoMode:original.demo,mvpMode:original.mvp,supabaseUrl:original.url,supabaseStorageKey:original.key,supabaseStorageBucket:original.bucket});
    await new Promise<void>(r=>server.close(()=>r()));
  }
});
