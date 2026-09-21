import test from 'node:test';
import assert from 'node:assert/strict';
import {seeds,acceptTask,transition,canReveal,tracks} from '../src/tasks.mjs';
test('agreement and assignment gate private details',()=>{const t=seeds[0]; assert.equal(canReveal(t,'worker'),false); assert.throws(()=>acceptTask(t,'worker','',true,'now'));assert.throws(()=>acceptTask(t,t.owner,'Name',true,'now'));const a=acceptTask(t,'worker','Name',true,'now');assert.equal(canReveal(a,'worker'),true);assert.equal(canReveal(a,'stranger'),false);assert.throws(()=>acceptTask(a,'another','Name',true,'now'));});
test('completion requires customer and ends collection',()=>{let t=acceptTask(seeds[0],'worker','Name',true,'now');assert.equal(tracks(t),true);t=transition(t,'worker','In progress');t=transition(t,'worker','Completion requested');assert.equal(tracks(t),false);assert.throws(()=>transition(t,'worker','Completed'));assert.equal(transition(t,t.owner,'Completed').status,'Completed');});
test('cancellation ends collection and access',()=>{const t=transition(acceptTask(seeds[0],'worker','Name',true,'now'),'worker','Cancelled');assert.equal(tracks(t),false);assert.equal(canReveal(t,'worker'),false);});
