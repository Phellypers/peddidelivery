import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseOptions } from '../src/db/options.js';

test('PostgreSQL local dispensa TLS; banco remoto exige certificado válido',()=>{
  const settings={databaseUrl:'postgresql://localhost:5432/peddi',databaseSSLMode:'auto',databaseSSLCAFile:'',databasePoolMax:5};
  assert.equal(databaseOptions(settings).ssl,false);
  const remote={...settings,databaseUrl:'postgresql://test.pooler.supabase.com:5432/postgres?sslmode=require'};
  const options=databaseOptions(remote);
  assert.deepEqual(options.ssl,{rejectUnauthorized:true});
  assert.deepEqual(databaseOptions({...remote,databaseSSLCA:'public-certificate'}).ssl,
    {rejectUnauthorized:true,ca:'public-certificate'});
  assert.equal(new URL(options.connectionString!).searchParams.has('sslmode'),false);
  assert.throws(()=>databaseOptions({...remote,databaseSSLMode:'disable'}));
  assert.throws(()=>databaseOptions({...settings,databaseUrl:'mongodb://localhost/test'}));
  assert.throws(()=>databaseOptions({...settings,databasePoolMax:0}));
  assert.throws(()=>databaseOptions({...settings,databaseUrl:'invalid-private-input'}),{message:'DATABASE_URL inválida; valor omitido.'});
});
