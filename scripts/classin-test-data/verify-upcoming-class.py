#!/usr/bin/env python3
"""CI-005a: prepare/execute/verify one authorized test classroom, never retry create."""
import argparse
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.runtime/private/classin-integration-int0-2026-09-14/upcoming-class'
HOST = 'https://dynamic14.eeo.im'
TEACHER, COURSE, CATEGORY, UNIT = 632586, 591820, 3153610, 53173128
STUDENTS = [634140, 634230, 634232]
TITLE = '【联调短课·CI005a】有理数复习与课前提醒验证'
START = int(datetime.fromisoformat('2026-09-15T19:30:00+08:00').timestamp())
END = START + 15 * 60


class ContractError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        raise ContractError('Redirect refused')


OPENER = urllib.request.build_opener(NoRedirect)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def save(name, value, exclusive=False):
    PRIVATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(PRIVATE / name, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW | (os.O_EXCL if exclusive else os.O_TRUNC), 0o600)
    with os.fdopen(fd, 'w') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.flush()
        os.fsync(file.fileno())


def load(name):
    return json.loads((PRIVATE / name).read_text())


def bff(op):
    with OPENER.open('http://127.0.0.1:4174/api/classin-test/' + op, timeout=40) as response:
        return json.load(response)['data']


def teacher(path, fields):
    spec = importlib.util.spec_from_file_location('classin_api', ROOT / 'reference/classin-api/scripts/classin_api.py')
    api = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api)
    uid, secret = api.load_credential(TEACHER)
    request = api.build_request(path, urllib.parse.urlencode(fields), True, uid, secret, HOST, None)
    with OPENER.open(request, timeout=25) as response:
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ContractError('Response too large')
    result = json.loads(raw)
    if result.get('error_info', {}).get('errno') != 1:
        raise ContractError('Business code: ' + str(result.get('error_info', {}).get('errno')))
    return result['data']


def proposal(scene):
    if scene['class']['id'] != str(COURSE) or scene['course']['id'] != str(CATEGORY) or scene['teacher']['id'] != f'classin-test:teacher:{TEACHER}' or not scene['complete']:
        raise ContractError('Scene ownership mismatch')
    if sorted(int(m['id']) for m in scene['members'] if m['identity'] == 1) != STUDENTS or len(scene['members']) != 3:
        raise ContractError('Authorized student set changed')
    if len(scene['activities']) != 53 or sum(a['kind'] == 'classroom' for a in scene['activities']) != 14:
        raise ContractError('Baseline inventory changed')
    if not 0 < START - time.time() <= 86400:
        raise ContractError('Outside real preclass window')
    units = [u for u in scene['units'] if u['id'] == str(UNIT)]
    if len(units) != 1 or sum(u['name'] == units[0]['name'] for u in scene['units']) != 1:
        raise ContractError('Unit name is not unique')
    categories = teacher('/lms/app/category/list', {'courseId': COURSE})['list']
    matching = [c for c in categories if c['name'] == scene['course']['name']]
    if len(matching) != 1 or matching[0]['categoryId'] != CATEGORY:
        raise ContractError('Category name is not unique')
    for activity in scene['activities']:
        if activity['name'] == TITLE:
            raise ContractError('Test class already exists')
        if activity['kind'] == 'classroom' and not activity.get('cancelled') and activity['startsAt'] and activity['endsAt']:
            a = datetime.fromisoformat(activity['startsAt'].replace('Z', '+00:00')).timestamp()
            b = datetime.fromisoformat(activity['endsAt'].replace('Z', '+00:00')).timestamp()
            if START < b and END > a:
                raise ContractError('Schedule conflict')
    payload = dict(login_uid=TEACHER, courseId=COURSE, unitName=units[0]['name'], categoryName=scene['course']['name'], name=TITLE,
                   teacherUid=TEACHER, assistantUids='[]', cameraHide=0, isDc=0, isHd=0, isAutoOnstage=1, screenMode=1,
                   seatNum=7, teachMode=1, liveState=0, openState=0, recordState=1, recordType=0, startTime=START, endTime=END,
                   maxScore=100, isScore=0, gradeDisplayId=0, systemGradeRuleId=0, systemMethod=0, publishFlag=2, abilityIds='[]',
                   isAllowCheck=0, systemGradeRuleConfig='{}', omoStationBroadcast=0,
                   course=json.dumps([{'courseId': COURSE, 'studentUid': STUDENTS, 'isAllStudent': 0}]),
                   aiSummaryConfig=json.dumps({'chapter': 1, 'subtitle': 1, 'teachingAnalysis': 0, 'teachingAnalysisAgentId': 0, 'realTimeSubtitleTranslation': 0}))
    return {'kind': 'ProposedAction', 'id': 'ci005a-upcoming-class-20260915', 'approval': {'decision': 'approved', 'source': 'user-approved-upgrade-plan-6.1'},
            'beforeVersion': scene['version'], 'payload': payload, 'payloadSha256': digest(payload), 'unitId': UNIT, 'categoryId': CATEGORY}


def verify():
    receipt = load('execution-receipt.json')
    result = receipt['result']
    if result.get('categoryId') != CATEGORY or result.get('unitId') != UNIT or not result.get('activityId') or not result.get('classId'):
        raise ContractError('Created object association mismatch; do not retry')
    scene = bff('scene')
    before = load('before-scene.json')
    old = {a['id']: a for a in before['activities']}
    current = {a['id']: a for a in scene['activities']}
    new_id = str(result['activityId'])
    if set(current) - set(old) != {new_id} or any(current.get(k) != v for k, v in old.items()):
        raise ContractError('Scene delta is not exactly the one new activity')
    detail = bff('detail?activityId=' + new_id)
    a = detail['activity']
    expected = {'id': new_id, 'bizId': str(result['classId']), 'categoryId': str(CATEGORY), 'unitId': str(UNIT), 'name': TITLE, 'kind': 'classroom', 'published': True}
    if any(a.get(k) != v for k, v in expected.items()) or sorted(int(s['id']) for s in detail['students']) != STUDENTS:
        raise ContractError('New activity/detail/student mismatch')
    for key, timestamp in [('startsAt', START), ('endsAt', END)]:
        if datetime.fromisoformat(a[key].replace('Z', '+00:00')).timestamp() != timestamp:
            raise ContractError('Class schedule mismatch')
    dynamics = bff('dynamics')
    items = [i for s in dynamics['stages'] if s['id'] == 'before' for i in s['items']]
    if not any(i.get('objectRef') == 'classin-test:activity:' + new_id and i.get('action') for i in items):
        raise ContractError('No actual preclass opportunity')
    save('after-scene.json', scene)
    save('after-detail.json', detail)
    save('after-dynamics.json', dynamics)
    receipt.update(state='verified-api-and-preclass-window', verifiedAt=time.time(), originalActivitiesUnchanged=True, studentCount=3, activityCount=len(scene['activities']))
    save('execution-receipt.json', receipt)
    print(json.dumps({k: v for k, v in receipt.items() if k != 'result'}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['prepare', 'execute', 'verify'])
    mode = parser.parse_args().mode
    if mode == 'verify':
        verify()
        return
    if (PRIVATE / 'attempted.json').exists():
        raise ContractError('Create already attempted; only verify is allowed')
    scene = bff('scene')
    plan = proposal(scene)
    if mode == 'prepare':
        save('proposed-action.json', plan, exclusive=True)
        save('before-scene.json', scene)
        print(json.dumps({'state': 'prepared', 'payloadSha256': plan['payloadSha256']}))
        return
    reviewed = load('proposed-action.json')
    if reviewed != plan:
        raise ContractError('Proposal or baseline changed')
    save('attempted.json', {'actionId': plan['id'], 'payloadSha256': plan['payloadSha256'], 'at': time.time()}, exclusive=True)
    result = teacher('/lms/app/activity/class/create', plan['payload'])
    save('execution-receipt.json', {'kind': 'ExecutionReceipt', 'actionId': plan['id'], 'businessCode': 1, 'state': 'accepted-awaiting-readback', 'result': result, 'at': time.time()})
    verify()


if __name__ == '__main__':
    main()
