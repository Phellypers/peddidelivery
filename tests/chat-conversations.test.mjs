import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConversations,filterConversations,matchesChatTab,remainingChatDays} from '../src/lib/chatConversations.js';
const tickets=[{id:'a',customer_name:'João',protocol:'SUP-123',reason:'question',status:'open',created_date:'2026-09-16T10:00:00Z'},{id:'b',customer_name:'Maria',protocol:'SUP-456',reason:'order_problem',status:'closed',closed_at:'2026-09-01T10:00:00Z',created_date:'2026-09-01T10:00:00Z'}];
const messages=[{id:'1',conversation_id:'a',sender_type:'customer',message:'Olá',created_date:'2026-09-16T10:00:00Z',is_read_by_store:false},{id:'2',conversation_id:'deliverer_x',customer_name:'Carlos',sender_type:'deliverer',message:'Entrega',created_date:'2026-09-16T09:00:00Z',is_read_by_store:false}];
const filters={search:'',tab:'customers',reason:'',status:'',from:'',to:''};
test('separates real conversations, unread counts and permanently closed protocols',()=>{
  const rows=buildConversations(messages,tickets);
  assert.equal(rows.length,3);assert.equal(rows.find(c=>c.id==='a').unread,1);
  assert.equal(rows.find(c=>c.id==='b').status,'closed');
  assert.equal(filterConversations(rows,filters).length,2);
  assert.equal(filterConversations(rows,{...filters,tab:'deliverers'}).length,1);
  assert.equal(rows.filter(c=>matchesChatTab(c,'unread')).length,2);
  assert.equal(rows.filter(c=>matchesChatTab(c,'closed')).length,1);
});
test('opening, replying and a new incoming message update labels and counts',()=>{
  const read=messages.map(m=>({...m,is_read_by_store:true}));
  assert.equal(buildConversations(read,tickets).find(c=>c.id==='a').status,'in_progress');
  const replied=[...read,{id:'3',conversation_id:'a',sender_type:'store',created_date:'2026-09-16T11:00:00Z'}];
  assert.equal(buildConversations(replied,tickets).find(c=>c.id==='a').status,'waiting');
  assert.equal(buildConversations([...replied,{...messages[0],id:'4',created_date:'2026-09-16T12:00:00Z'}],tickets).find(c=>c.id==='a').status,'unread');
});
test('filters names, protocols, reason, status and date boundaries',()=>{
  const rows=buildConversations(messages,tickets);
  for(const search of ['joão','sup-123'])assert.equal(filterConversations(rows,{...filters,search})[0].id,'a');
  assert.equal(filterConversations(rows,{...filters,reason:'order_problem'})[0].id,'b');
  assert.equal(filterConversations(rows,{...filters,status:'closed'})[0].id,'b');
  assert.equal(filterConversations(rows,{...filters,from:'2026-09-16',to:'2026-09-16'}).length,1);
  assert.equal(filterConversations(rows,{...filters,to:'2026-08-31'}).length,0);
});
test('retention countdown and new protocol preserve closed history',()=>{
  assert.equal(remainingChatDays(tickets[1],new Date('2026-09-16T10:00:00Z').getTime()),15);
  assert.equal(remainingChatDays(tickets[1],new Date('2026-10-02').getTime()),0);
  const rows=buildConversations(messages,[...tickets,{...tickets[1],id:'c',status:'open'}]);
  assert.equal(rows.find(c=>c.id==='b').status,'closed');assert.equal(rows.find(c=>c.id==='c').status,'in_progress');
});
