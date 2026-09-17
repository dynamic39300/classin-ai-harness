#!/usr/bin/env python3
"""Build deterministic mixed-type quiz data from the reviewed single-choice set."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/01-research/classin-unit-exam-set-2026-09-13.json"
OUTPUT = ROOT / "docs/01-research/classin-unit-mixed-exam-set-2026-09-13.json"

# Two new constructed-response questions per unit. Every answer has been worked out.
SUBJECTIVE = {
  1: [
    ("计算 1/(1×2)＋1/(2×3)＋…＋1/(2025×2026)，写出拆项与抵消过程。", "利用 1/[n(n+1)]=1/n－1/(n+1)，原式=(1－1/2)+(1/2－1/3)+…+(1/2025－1/2026)=1－1/2026=2025/2026。"),
    ("解方程 |x＋2|＋|x－3|=9，并在数轴上说明两个解所在的位置。", "当 -2≤x≤3 时左边恒为5，不合题意。x＜-2 时，-x-2+3-x=9，得 x=-4；x＞3 时，x+2+x-3=9，得 x=5。因此解为 x=-4 或 x=5。")],
  3: [
    ("数轴上 P 从 -8 出发以每秒3个单位向右运动，Q 从 10 同时以每秒1个单位向左运动，二者相遇后仍按原方向运动。求出发后两点距离为6个单位的所有时刻，并写出此时两点坐标。", "t秒时 P=-8+3t，Q=10-t。由 |P-Q|=|-18+4t|=6，得 t=3 或 t=6。t=3 时 P=1、Q=7；t=6 时 P=10、Q=4。"),
    ("数轴上 A=-6、B=6。P 从 A 以每秒3个单位向右运动，到 B 后立即原速返回；Q 从 A 同时以每秒1个单位向右运动。求 P 返回途中与 Q 相遇的时刻和相遇点坐标。", "P在第4秒到达B。返回途中 P=6-3(t-4)=18-3t，Q=-6+t。令二者相等，得18-3t=-6+t，t=6；相遇坐标为0。")],
  5: [
    ("已知 A=2x²－3x＋1，B=x²＋2x－4。先化简 2A－3B，再求 x=-2 时的值。", "2A－3B=2(2x²－3x＋1)－3(x²＋2x－4)=x²－12x＋14。代入 x=-2，得4+24+14=42。"),
    ("某多项式减去 2x²－3x＋5 时，被误算成加上这个式子，错误结果为 5x²－x＋8。求原多项式和正确结果。", "设原多项式为P。由 P+(2x²－3x＋5)=5x²－x＋8，得P=3x²+2x+3。正确结果P-(2x²－3x＋5)=x²+5x－2。")],
  7: [
    ("定义 a★b=a＋b－ab。若 x★2=-3，求 x，并计算 (x★1)★0；写出每一步。", "x+2-2x=-3，得x=5。x★1=x+1-x=1，所以(x★1)★0=1★0=1。"),
    ("对整数 n 定义 T(n)：n 为偶数时 T(n)=n/2，n 为奇数时 T(n)=3n＋1。从5出发连续做6次T运算，依次写出每次结果。", "5→16→8→4→2→1→4，所以连续6次后的结果是4。")],
  9: [
    ("在线段 AB 上依次有点 C、D。已知 AC=3、DB=5，AC 的中点 M 与 DB 的中点 N 相距12。求 CD，并用线段和差关系说明。", "设A=0，则C=3，M=3/2。设CD=x，则D=3+x，B=8+x，N=(D+B)/2=11/2+x。MN=4+x=12，得x=8，所以CD=8。"),
    ("A、B、C 共线，AB=7、AC=11，M、N 分别为 AB、AC 的中点。分别求 B、C 在 A 同侧和异侧时的 MN，并求异侧值是同侧值的多少倍。", "同侧时 MN=|AC-AB|/2=(11-7)/2=2；异侧时 MN=(AC+AB)/2=(11+7)/2=9；倍数为9/2。")],
  11: [
    ("∠AOB=150°。OP 从 OA 以每秒5°在角内转向 OB。OM、ON 分别平分 ∠AOP、∠POB。当 ∠AOM:∠NOB=2:1 时，求运动时间和 ∠POB。", "设运动t秒，则∠AOP=5t，∠POB=150-5t，∠AOM=5t/2，∠NOB=(150-5t)/2。由二者之比为2:1，得5t=2(150-5t)，t=20秒，∠POB=50°。"),
    ("OA、OB 为反向射线，OC 位于同一半平面且 ∠AOC=60°。OP 从 OA 以每秒10°转向 OB。求0≤t≤18内 ∠COP=40°的所有时刻。", "t秒时∠AOP=10t，OC对应60°方向，所以∠COP=|10t-60|。解|10t-60|=40，得t=2或t=10，均在范围内。")],
  13: [
    ("一项工程甲单独做需12天，乙单独做需18天。两人先合作3天，余下由甲单独完成。求甲还需多少天，并检验总工作量。", "甲、乙效率分别为1/12和1/18，合作效率为5/36。3天完成5/12，剩余7/12。甲单独完成需(7/12)÷(1/12)=7天。检验：3×5/36+7×1/12=1。"),
    ("某商品按成本加价25%标价，再按标价九折出售，每件仍获利30元。求成本、标价和售价。", "设成本为x元，标价为1.25x，售价为0.9×1.25x=1.125x。由1.125x-x=30，得0.125x=30，x=240。标价300元，售价270元。")],
}

def p(text): return f"<p>{html.escape(str(text))}</p>"

base=json.loads(SOURCE.read_text())
exams=[]
for exam in base['exams']:
    lesson=exam['lesson']; qs=exam['questions']
    # Correct a reviewed-source arithmetic typo before deriving the mixed paper:
    # x²-12x+14 at x=-2 is 42, not 46.
    if lesson == 5:
        qs[1]['options'][2] = '42'
        qs[1]['analysis'] = '2A-3B=x²-12x+14，代入-2得4+24+14=42。'
    out=[]
    for src in qs[:2]:
        out.append({'topicType':1,'content':p(src['question']),'options':[p(x) for x in src['options']],
                    'answer':[str(src['answer'])],'analyse':p(src['analysis'])})
    for left,right in ((qs[2],qs[3]),(qs[4],qs[5])):
        lc=left['options'][left['answer']-1]; rc=right['options'][right['answer']-1]
        lw=next(x for i,x in enumerate(left['options'],1) if i!=left['answer'])
        rw=next(x for i,x in enumerate(right['options'],1) if i!=right['answer'])
        content=p('分别完成① '+left['question']+' ② '+right['question']+' 选择所有正确结论。')
        options=[p('①的结果为 '+lc),p('①的结果为 '+lw),p('②的结果为 '+rc),p('②的结果为 '+rw)]
        analyse=p('① '+left['analysis']+' ② '+right['analysis'])
        out.append({'topicType':2,'content':content,'options':options,'answer':['1','3'],'analyse':analyse})
    for idx,src in enumerate(qs[6:8]):
        correct=src['options'][src['answer']-1]
        if idx==0:
            statement=src['question']+' 其正确结果为 '+correct+'。'; ans='1'
        else:
            wrong=next(x for i,x in enumerate(src['options'],1) if i!=src['answer'])
            statement=src['question']+' 其正确结果为 '+wrong+'。'; ans='0'
        out.append({'topicType':3,'content':p(statement),'options':[],'answer':[ans],'analyse':p(src['analysis'])})
    for src in qs[8:10]:
        correct=src['options'][src['answer']-1]
        out.append({'topicType':4,'content':p(src['question']+' 答：______。'),'options':[],
                    'alternativeAnswer':json.dumps([[correct]],ensure_ascii=False),'sensitive':0,'order':0,'analyse':p(src['analysis'])})
    for image_no,(question,answer) in enumerate(SUBJECTIVE[lesson],1):
        out.append({'topicType':5,'content':'','imageQuestion':question,'imageNo':image_no,'options':[],
                    'answer':[p(answer)],'analyse':p(answer),'subjectiveNameId':0})
    assert len(out)==10
    for number,q in enumerate(out,1):
        q.update({'number':number,'score':10,'topicSource':0,'degree':4,'pointIds':[],'textbookIds':[],'dimensions':[]})
    exams.append({'lesson':lesson,'topic':exam['topic'],'total_score':100,'limit_minutes':45,
                  'type_distribution':{'single_choice':2,'multiple_choice':2,'judge':2,'blank_fill':2,'subjective_image':2},'questions':out})

doc={'truth':'AI_GENERATED_TEST_CONTENT','policy':'Seven unit tests; each has 10 questions, 100 points, five verified question types, and two exact-text subjective-question images.','exams':exams}
OUTPUT.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':str(OUTPUT),'exams':len(exams),'questions':sum(len(x['questions']) for x in exams),'images':sum(1 for x in exams for q in x['questions'] if q.get('imageQuestion'))},ensure_ascii=False))
