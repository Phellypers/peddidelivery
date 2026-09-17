import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePeddiAccess, PEDDI_SUPPORT_REQUEST_LIMIT } from '../../src/lib/peddiAccount.js';

test('development remains open; expired founder keeps badge and returns to Free',()=>{
  const access=resolvePeddiAccess({founderSince:'2025-01-01',founderExpiresAt:'2025-02-01',now:Date.UTC(2026,0,1)});
  assert.equal(access.state,'FREE');assert.equal(access.founderBadge,true);
  assert.ok(access.features.every(feature=>feature.accessible));
});
test('future feature policy respects entitlements and permanent operational demo',()=>{
  const limited=resolvePeddiAccess({enforce:true,entitlements:[{feature:'ADVANCED_FINANCE'}]});
  assert.equal(limited.state,'FREE_WITH_ADDONS');
  assert.equal(limited.features.find(f=>f.id==='ADVANCED_FINANCE')!.accessible,true);
  assert.equal(limited.features.find(f=>f.id==='ADVANCED_INVENTORY')!.accessible,false);
  assert.ok(resolvePeddiAccess({email:'gestor.demo@peddi.local',enforce:true}).features.every(f=>f.accessible));
  assert.equal(resolvePeddiAccess({email:'designer.demo@peddi.app'}).canMutateCommercial,false);
  assert.equal(PEDDI_SUPPORT_REQUEST_LIMIT,8);
});
