"""Render a static, searchable inventory; never calls a business API."""
from pathlib import Path
import json, csv, html, collections
root=Path(__file__).resolve().parent
data=json.loads((root/'interface-candidates.json').read_text())
rows=data['candidates']
def domain(r):
 s=r['base']+' '+r['path']
 if 'question-bank' in s:return '题库与试卷'
 if any(x in s for x in ['agentin','agent-api','course-ai-assistant','lms-ai-service']):return 'Agent 与 AI'
 if any(x in s for x in ['/apix/','/business/']):return '共创与 Flowin'
 if any(x in s for x in ['cloudspace','clouddisk']):return '云盘与文件'
 if 'todocenter' in s:return '待办'
 if any(x in s for x in ['schedule-bff','/classroom','/course']):
  if '/lms' not in r['base']:return '班级、课堂与课表'
 if '/lms' in r['base']:return '课程分类、单元与活动'
 if '/files/' in r['path'] or '/root/search' in r['path']:return '外部云存储'
 if 'finance' in s or 'metering' in s:return '计量与权益'
 if any(x in s for x in ['usercenter','/coreapi','/school','/uc','zero-user-wx','client-base-api']):return '身份、组织与设置'
 return '基础服务与其他'
counts=collections.Counter()
for r in rows:
 r['domain']=domain(r);counts[r['domain']]+=1
 r['teacherAuthorization']='UNVERIFIED'
 r['businessExecuted']=False
 r['sourceURL']='https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/'+r['occurrences'][0]['file']
# This is an enriched view; retain original candidates as extraction evidence.
(root/'interface-index.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
with (root/'interface-index.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['ID','功能域','方法','服务前缀原文','调用路径原文','源码参数键（非完整schema）','发现级别','教师权限','来源URL','行','列'])
 for r in rows:
  o=r['occurrences'][0];w.writerow([r['id'],r['domain'],r['method'],r['base'],r['path'],','.join(r['parameterKeys']),r['confidence'],'未验证',r['sourceURL'],o['line'],o['column']])
escape=html.escape
body=[]
for r in rows:
 o=r['occurrences'][0]
 text=' '.join([r['id'],r['domain'],r['method'],r['base'],r['path'],','.join(r['parameterKeys'])]).lower()
 body.append('<tr data-domain="'+escape(r['domain'])+'" data-search="'+escape(text,quote=True)+'"><td>'+r['id']+'</td><td>'+r['domain']+'</td><td>'+r['method']+'</td><td><code>'+escape(r['base'])+'</code></td><td><code>'+escape(r['path'])+'</code></td><td>'+escape(', '.join(r['parameterKeys']) or '未展开')+'</td><td><a href="'+r['sourceURL']+'" target="_blank" rel="noopener">源码</a><br><small>模块 '+str(o['moduleId'])+' · '+str(o['line'])+':'+str(o['column'])+'</small></td></tr>')
options=''.join('<option>'+escape(k)+'</option>' for k in counts)
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ClassIn PC 接口扫描</title><style>
:root{font-family:system-ui,-apple-system,"PingFang SC",sans-serif;color:#18262b;background:#f6f8f8}body{margin:0;padding:32px}h1{font-size:28px;margin:8px 0}p{line-height:1.7;max-width:1000px}header{margin-bottom:24px}.label{color:#557067;font-size:13px}strong{color:#006b4b}.filters{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}input,select{padding:11px;border:1px solid #b9c9c3;border-radius:5px;background:white;font:inherit}input{width:min(540px,90vw)}.table{overflow:auto;background:white;border:1px solid #d7e0dc}table{border-collapse:collapse;width:100%;font-size:13px}th{position:sticky;top:0;background:#edf3f0;text-align:left;white-space:nowrap}th,td{padding:13px 12px;border-bottom:1px solid #e4eae7;vertical-align:top}code{overflow-wrap:anywhere;font-size:12px}td:nth-child(5){min-width:250px}td:nth-child(4){min-width:120px}small{color:#6b7a75;white-space:nowrap}a{color:#006b4b}.hint{border-left:3px solid #00865b;padding-left:14px}footer{margin:20px 0;color:#64736d}@media(max-width:700px){body{padding:16px}h1{font-size:23px}}
</style><header><span class="label">部署 v6.202609091558.six.14 · 2026-09-11</span><h1>ClassIn PC 接口扫描</h1><p><strong>807 个脚本 · 350 条静态调用候选 · 教师授权均待验证</strong></p><p class="hint">这是当前部署代码的调用定义清单，含教师、学生、共享和外部资源能力。相同最终路径可能由不同前缀/包装器重复定义；350 不是去重后的可用服务端接口数。HTTP POST 也可能用于读取。参数键只是源码线索，不代表必填或完整 schema。此次没有调用业务接口。</p><p>原生客户端桥、运行时配置、其他微应用仍有覆盖边界。<a href="../CLASSIN-PC-API-SCAN-2026-09-11.md">阅读报告</a> · <a href="interface-index.csv" download>下载 CSV</a> · <a href="interface-index.json" download>下载 JSON</a></p></header><div class="filters"><input id="q" aria-label="搜索接口" placeholder="搜索路径、参数、功能或 ID"><select id="domain" aria-label="筛选功能域"><option value="">全部功能域</option>'''+options+'''</select><span id="count" role="status"></span></div><div class="table"><table><thead><tr><th>ID</th><th>功能域</th><th>HTTP</th><th>服务前缀</th><th>调用路径</th><th>参数线索</th><th>证据</th></tr></thead><tbody>'''+''.join(body)+'''</tbody></table></div><footer>数据只来自公开构建文件；不包含登录凭据、业务响应或真实学生记录。</footer><script>
const q=document.getElementById('q'),domain=document.getElementById('domain'),rows=[...document.querySelectorAll('tbody tr')];function filter(){const term=q.value.trim().toLowerCase();let n=0;for(const row of rows){const show=(!domain.value||row.dataset.domain===domain.value)&&row.dataset.search.includes(term);row.hidden=!show;if(show)n++}document.getElementById('count').textContent=n+' / '+rows.length+' 条'}q.addEventListener('input',filter);domain.addEventListener('change',filter);filter();
</script></html>'''
(root/'index.html').write_text(page)
(root/'summary.json').write_text(json.dumps({'definitions':len(rows),'domains':dict(counts),'methods':dict(collections.Counter(r['method'] for r in rows)),'evidence':dict(collections.Counter(r['confidence'] for r in rows))},ensure_ascii=False,indent=2))
print((root/'summary.json').read_text())
