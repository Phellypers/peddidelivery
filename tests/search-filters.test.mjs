import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSearchFilters as defaults, filterSearchProducts as filter } from '../src/lib/searchFilters.js';
const products = [
  {id:'a',name:'Pizza',price:30,promo_price:20,category_ids:['pizza'],orders_count:4,stock:1,created_date:'2026-09-01'},
  {id:'b',name:'Suco',price:10,category_ids:['drink'],orders_count:8,stock:0,created_date:'2026-09-15'},
];
test('sorts by actual order counts and promotional price without mutating catalog', () => {
  assert.deepEqual(filter(products,'','',defaults).map(p=>p.id),['b','a']);
  assert.deepEqual(filter(products,'','',{...defaults,sort:'price_high'}).map(p=>p.id),['a','b']);
  assert.equal(products[0].id,'a');
});
test('combines query, categories, price range, promotions and availability', () => {
  assert.deepEqual(filter(products,'piz','pizza',{...defaults,min:'19',max:'21',promotions:true,available:true}).map(p=>p.id),['a']);
  assert.equal(filter(products,'','',{...defaults,available:true}).length,1);
  assert.equal(filter(products,'','',{...defaults,max:'9'}).length,0);
});
