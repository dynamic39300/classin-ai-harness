const fs=require('fs'),path=require('path');
const parser=require(process.cwd()+'/node_modules/@babel/parser');
const traverse=require(process.cwd()+'/node_modules/@babel/traverse').default;
const root=process.argv[2]||'/tmp/classin-pc-api-scan';
const out=process.argv[3]||process.cwd()+'/docs/01-research/classin-pc-api-scan-2026-09-11';
const records=[],errors=[];
const exportBases=new Map();
function unwrap(n){if(n?.type==='SequenceExpression')return unwrap(n.expressions.at(-1));return n}
function key(n){return n?.name??n?.value}
function str(n){n=unwrap(n);if(!n)return null;if(n.type==='StringLiteral')return n.value;if(n.type==='TemplateLiteral')return n.quasis.map((q,i)=>q.value.cooked+(i<n.expressions.length?'${dynamic}':'')).join('');if(n.type==='BinaryExpression'&&n.operator==='+'){const a=str(n.left),b=str(n.right);return a!==null||b!==null?(a??'${dynamic}')+(b??'${dynamic}'):null}if(n.type==='CallExpression'&&key(n.callee.property)==='concat'){const a=str(n.callee.object);if(a!==null)return a+n.arguments.map(x=>str(x)??'${dynamic}').join('')}return null}
function name(n){n=unwrap(n);if(!n)return '';if(n.type==='Identifier')return n.name;if(n.type==='MemberExpression')return name(n.object)+'.'+key(n.property);return ''}
function moduleId(p){let q=p;while(q){if(q.isObjectProperty()&&/^\d+$/.test(String(key(q.node.key)))&&['ArrowFunctionExpression','FunctionExpression'].includes(q.node.value.type))return String(key(q.node.key));q=q.parentPath}return null}
function resolve(n,scope,seen=new Set(),depth=0){n=unwrap(n);if(!n||depth>7)return null;
 if(n.type==='Identifier'){const b=scope.getBinding(n.name);if(!b||seen.has(b))return null;seen=new Set(seen);seen.add(b);if(b.path.isVariableDeclarator())return resolve(b.path.node.init,b.path.scope,seen,depth+1);return null}
 if(n.type==='MemberExpression'){
 const b=n.object.type==='Identifier'?scope.getBinding(n.object.name):null;const init=unwrap(b?.path.node.init);
 if(init?.type==='CallExpression'&&init.arguments[0]?.type==='NumericLiteral')return exportBases.get(init.arguments[0].value+'.'+key(n.property))??null;
}
 if(n.type==='CallExpression'){
  const nm=name(n.callee);
  if(/createAxios(?:Get)?Instance|createRequest|createFetch|\.(?:uR|\$u)$/.test(nm))return {base:str(n.arguments[0])??'UNKNOWN',method:/GetInstance/.test(nm)?'GET':'POST',methodEvidence:'reviewed_axios_factory_default',factory:nm};
  if(/\.create$/.test(nm)&&n.arguments[0]?.type==='ObjectExpression'){const props=n.arguments[0].properties;const b=props.find(p=>key(p.key)==='baseURL');if(b)return {base:str(b.value)??'DYNAMIC',method:'UNKNOWN',factory:nm}}
 }
 if(n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression'){
  let result=null;
  // Only inspect direct syntactic wrapper calls, never evaluate source.
  function walk(x){if(!x||typeof x!=='object'||result)return;if(x.type==='CallExpression'){const z=resolve(x.callee,scope,seen,depth+1);if(z)result=z}for(const [k,v] of Object.entries(x)){if(['loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}}
  walk(n.body);return result;
 }
 return null;
}
const apiPrefix=/^(?:\$\{dynamic\})?\/?(?:app\/|web\/|api\/|apix\/|lms\/|course\/|coreapi\/|cloudspace\/|usercenter\/|zero-usercenter\/|space\/|todocenter\/|agent-api\/|agentin\/|business\/|finance\/|saasajax\/|classin\.api\.php\?|server\.ajax\.php\?|ajax\.php\?)/;
const excluded=/\.(?:push|replace|navigate|includes|startsWith|endsWith|split|indexOf|match|test|setItem|mark|add|has|delete|getItem|set)$|^(?:require|import)$/;
// Discover exported request instances before extracting calls. No deployed code is executed.
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){
 const s=fs.readFileSync(path.join(root,file),'utf8');let ast;try{ast=parser.parse(s,{sourceType:'unambiguous'})}catch{continue}
 traverse(ast,{CallExpression(p){if(key(p.node.callee.property)!=='d'||p.node.arguments[1]?.type!=='ObjectExpression')return;const mid=moduleId(p);if(!mid)return;for(const prop of p.get('arguments.1.properties')){const value=prop.get('value');if(!value?.node||value.node.type!=='ArrowFunctionExpression')continue;const b=resolve(value.node.body,value.scope);if(b)exportBases.set(mid+'.'+key(prop.node.key),b)}}});
}
if(fs.existsSync(root+'/manual-transport-map.json'))for(const v of JSON.parse(fs.readFileSync(root+'/manual-transport-map.json')))if(v.kind!=='factory')exportBases.set(v.moduleId+'.'+v.exportName,{base:v.basePrefix,method:v.method,methodEvidence:'reviewed_transport',factory:v.moduleId+'.'+v.exportName});
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){
 const s=fs.readFileSync(path.join(root,file),'utf8');let ast;
 try{ast=parser.parse(s,{sourceType:'unambiguous',errorRecovery:true})}catch(e){errors.push({file,error:e.message});continue}
 traverse(ast,{CallExpression(p){const n=p.node,c=unwrap(n.callee),nm=name(c),a=n.arguments[0],v=str(a);if(!v||!(/^(?:\/|https?:|\$\{dynamic\}|[a-zA-Z_.-]+\.php\?|[a-zA-Z_-]+\/[a-zA-Z_])/.test(v))||v.length>500||/\.(?:png|jpg|svg|css|woff|js)(?:\?|$)/i.test(v))return;
 if(v.startsWith('${dynamic}')&&!/\/[a-zA-Z]/.test(v))return;
 const meth=c?.type==='MemberExpression'?String(key(c.property)).toUpperCase():'';
 const http=['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(meth)&&!v.startsWith('http')&&!/searchParams|localStorage|\.style|\.classList|\.headers/i.test(nm);
 const res=resolve(http?c.object:c,p.scope);
 const api=apiPrefix.test(v)||/\.php\?action=/.test(v)||/^(?:activity|unit|category|course|report|score|school|user|todo|homework|classroom|file|member|session|message|common)\//.test(v);
 if(!http&&!res&&!api)return;
 if(!http&&!res&&(excluded.test(nm)||/^\/course\/detail\//.test(v)))return;
 if(/createAxios(?:Get)?Instance|createRequest|\.(?:uR|\$u|create)$/.test(nm))return;
 if(moduleId(p)==='563526'&&nm==='m')return;
 if(c?.type==='Import'||['jsx','jsxs','createElement'].includes(key(c?.property)))return;
 const params=n.arguments[1];
 let fetchMethod=null;if(nm==='fetch'&&params?.type==='ObjectExpression')fetchMethod=str(params.properties.find(x=>key(x.key)==='method')?.value)?.toUpperCase()??'GET';const fields=params?.type==='ObjectExpression'?params.properties.filter(x=>x.type==='ObjectProperty').map(x=>String(key(x.key))):[];
 records.push({path:v,method:http?meth:fetchMethod??res?.method??'UNKNOWN',base:res?.base??'UNKNOWN',confidence:http||res?'REQUEST_CALL':'API_PATH_CALL_CANDIDATE',callee:nm||'indirect_call',factory:res?.factory??null,methodEvidence:http?'explicit_http_method':res?.methodEvidence??'unresolved',parameterKeys:fields,moduleId:moduleId(p),file,line:n.loc.start.line,column:n.loc.start.column+1,offset:n.start});
 },ObjectProperty(p){if(key(p.node.key)!=='url')return;const v=str(p.node.value);if(!v||!apiPrefix.test(v))return;const obj=p.parentPath.node;const method=obj.properties?.find(x=>key(x.key)==='method');records.push({path:v,method:str(method?.value)?.toUpperCase()??'UNKNOWN',base:'UNKNOWN',confidence:'URL_CONFIG_CANDIDATE',callee:'url_config',parameterKeys:[],moduleId:moduleId(p),file,line:p.node.loc.start.line,column:p.node.loc.start.column+1,offset:p.node.start})}})
}
const unique=new Map();for(const r of records){const k=r.base+'|'+r.method+'|'+r.path;let x=unique.get(k);if(!x){x={...r,occurrences:[]};delete x.file;delete x.line;delete x.column;delete x.offset;unique.set(k,x)}x.occurrences.push({file:r.file,line:r.line,column:r.column,offset:r.offset,moduleId:r.moduleId});x.parameterKeys=[...new Set([...x.parameterKeys,...r.parameterKeys])];if(r.confidence==='REQUEST_CALL')x.confidence=r.confidence}
const rows=[...unique.values()].sort((a,b)=>(a.base+a.path).localeCompare(b.base+b.path));rows.forEach((r,i)=>r.id='PCAPI-'+String(i+1).padStart(4,'0'));
fs.writeFileSync(out+'/interface-candidates.json',JSON.stringify({scope:'STATIC_ONLY_NOT_AUTHORIZED',sourcePage:'https://wsevlf001.eeo.im/client/lmsbleach/six/',build:'v6.202609091558.six.14',filesScanned:fs.readdirSync(root).filter(f=>f.endsWith('.js')).length,parseErrors:errors,candidates:rows},null,2));
console.log(JSON.stringify({files:807,occurrences:records.length,unique:rows.length,errors,confidence:rows.reduce((a,r)=>(a[r.confidence]=(a[r.confidence]||0)+1,a),{}),bases:[...new Set(rows.map(r=>r.base))]},null,2));
