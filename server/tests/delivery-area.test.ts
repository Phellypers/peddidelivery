import test from 'node:test';
import assert from 'node:assert/strict';
import { findDeliveryArea, validateDeliveryAddress } from '../../src/lib/deliveryArea.js';
import { getSplitPaymentStatus } from '../../src/lib/splitPayment.js';

const area={id:'region',name:'Riacho Fundo II',state:'DF',is_active:true,delivery_fee_type:'fixed',delivery_fee_value:5};
const address={address:'QN 7, casa 4',city:'Brasília',neighborhood:'Riacho Fundo 2',state:'DF',zip:'71880-000'};
test('delivery matches administrative region through neighborhood, accents and Roman numbers',()=>{
  assert.equal(validateDeliveryAddress([area],address).valid,true);
  assert.equal(findDeliveryArea([area],{...address,neighborhood:'',city:'Riacho Fundo II - DF'}).area?.id,'region');
  assert.equal(findDeliveryArea([{...area,aliases:'RF II; RF 2'}],{...address,neighborhood:'RF II'}).allowed,true);
  assert.equal(findDeliveryArea([area],{...address,neighborhood:'Riacho Fundo'}).allowed,false);
});
test('inactive regions and different states cannot authorize delivery',()=>{
  assert.equal(validateDeliveryAddress([{...area,is_active:false}],address).valid,false);
  assert.equal(validateDeliveryAddress([area],{...address,state:'GO'}).valid,false);
  assert.equal(validateDeliveryAddress([],address,{hasConfiguredAreas:true}).valid,false);
  assert.equal(validateDeliveryAddress([],address).valid,true);
});
test('postal ranges have inclusive boundaries and support parent municipality',()=>{
  const ranges=[{...area,zip_start:'71880-000',zip_end:'71889-999',municipality:'Brasília'}];
  assert.equal(validateDeliveryAddress(ranges,{...address,neighborhood:''}).valid,true);
  assert.equal(validateDeliveryAddress(ranges,{...address,zip:'71889999'}).valid,true);
  assert.equal(validateDeliveryAddress(ranges,{...address,zip:'71890000'}).valid,false);
  assert.equal(validateDeliveryAddress(ranges,{...address,city:'Outra cidade',neighborhood:''}).valid,false);
});
test('required address, postal code, regional minimum and pickup are validated',()=>{
  assert.equal(validateDeliveryAddress([area],{...address,address:''}).reason,'missing_address');
  assert.equal(validateDeliveryAddress([area],{...address,zip:'abc71880000'}).reason,'invalid_zip');
  assert.equal(validateDeliveryAddress([{...area,min_order_value:30}],address,{subtotal:20}).reason,'minimum');
  assert.equal(validateDeliveryAddress([{...area,is_active:false}],{deliveryMethod:'pickup'}).valid,true);
});
test('split payment compares monetary cents without floating point residuals',()=>{
  assert.equal(getSplitPaymentStatus(0.3,{pix:0.1,cash:0.2}).isValid,true);
  assert.equal(getSplitPaymentStatus(45.98,{pix:20,cash:25.98}).isValid,true);
  assert.equal(getSplitPaymentStatus(45.98,{pix:45.97}).differenceCents,1);
  assert.equal(getSplitPaymentStatus(45.98,{pix:45.99}).differenceCents,-1);
});
