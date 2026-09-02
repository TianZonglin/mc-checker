const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dbFile = path.join(root, 'data.json');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml' };
function db() { try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch { return { students: [], history: [] }; } }
function save(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }
function json(res, status, data) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); }
function body(req) { return new Promise((ok, bad) => { let s=''; req.on('data',x=>s+=x); req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){bad(e)}}); }); }
function csvNames(text) { return [...new Set(text.split(/[\n,，;；\t]+/).map(x=>x.trim()).filter(x=>x && !/^(姓名|name|学生)$/i.test(x)))]; }

http.createServer(async (req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state' && req.method === 'GET') return json(res,200,db());
  if (url.pathname === '/api/import' && req.method === 'POST') { const d=db(), b=await body(req); d.students=csvNames(b.text||''); save(d); return json(res,200,d); }
  if (url.pathname === '/api/record' && req.method === 'POST') { const d=db(), b=await body(req); if(!d.students.includes(b.name)) return json(res,400,{error:'学生不存在'}); const r={id:Date.now(), name:b.name, status:b.status||'到课', mode:b.mode||'单点', time:new Date().toISOString()}; d.history.unshift(r); save(d); return json(res,200,r); }
  if (url.pathname === '/api/record/status' && req.method === 'POST') { const d=db(), b=await body(req), r=d.history.find(x=>String(x.id)===String(b.id)); if(!r) return json(res,404,{error:'记录不存在'}); if(!['到课','迟到','缺勤'].includes(b.status)) return json(res,400,{error:'状态无效'}); r.status=b.status; save(d); return json(res,200,r); }
  if (url.pathname === '/api/reset' && req.method === 'POST') { save({students:[],history:[]}); return json(res,200,{ok:true}); }
  const file = url.pathname === '/' ? '/index.html' : url.pathname;
  const safe = path.normalize(path.join(root, file));
  if (!safe.startsWith(root) || !fs.existsSync(safe) || fs.statSync(safe).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, {'Content-Type':mime[path.extname(safe)]||'application/octet-stream'}); fs.createReadStream(safe).pipe(res);
}).listen(3000, () => console.log('Block Rollcall running: http://localhost:3000'));
