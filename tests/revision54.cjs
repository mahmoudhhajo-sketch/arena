const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,p)=>m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,p);
const {arenaConfidence:a}=require('../src/engine/economy.ts');
assert.deepEqual(a(6,40,0,20000,false),a(6,0,0,20000,false));
assert.deepEqual(a(6,40,40,20000,true),a(6,40,0,20000,true));
assert.ok(a(6,40,0,0,true).multiplier>1);
assert.ok(a(6,0,40,0,false).multiplier<1);
assert.ok(a(16,0,40,0,false).fear<a(2,0,40,0,false).fear);
console.log('Home glory / away dread / toughness resistance passed');
