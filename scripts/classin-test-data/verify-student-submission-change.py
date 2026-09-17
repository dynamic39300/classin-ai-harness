#!/usr/bin/env python3
"""CI-008f: one reviewed test action; no identity-switching feature or automatic retry.

Reads a private ProposedAction. Default probes only; --execute sends at most once.
All network destinations and the course are fixed to the authorized test scope.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.runtime/private/classin-integration-int0-2026-09-14/student-submission-change'
HOST = 'https://dynamic14.eeo.im'
TEACHER = 632586
COURSE = 591820
CATEGORY = 3153610
ACTIVITY = 54580409


class ContractError(Exception):
    def __init__(self, message, business_code=None):
        super().__init__(message)
        self.business_code = business_code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        raise ContractError('Redirect refused')


OPENER = urllib.request.build_opener(NoRedirect)


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def save(name, value, exclusive=False):
    flags = os.O_WRONLY | os.O_CREAT | (os.O_EXCL if exclusive else os.O_TRUNC)
    fd = os.open(PRIVATE / name, flags | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.flush()
        os.fsync(file.fileno())


def read_response(request):
    with OPENER.open(request, timeout=25) as response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ContractError('Response too large')
        value = json.loads(raw)
        code = value.get('error_info', {}).get('errno') if 'error_info' in value else value.get('code')
        success = code == (1 if 'error_info' in value else 0)
        if not success:
            raise ContractError(f'Business response refused: {code}', code)
        return value.get('data'), code


def bff_detail():
    with OPENER.open(f'http://127.0.0.1:4174/api/classin-test/detail?activityId={ACTIVITY}', timeout=30) as response:
        return json.load(response)['data']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--attempt', type=int, choices=[1, 2], default=1)
    args = parser.parse_args()
    plan = json.loads((PRIVATE / 'proposed-action.json').read_text())
    if plan['kind'] != 'ProposedAction' or plan['activityId'] != ACTIVITY or plan['courseId'] != COURSE or plan['categoryId'] != CATEGORY:
        raise ContractError('Action scope mismatch')
    if plan['approval']['decision'] != 'approved' or plan['approval']['source'] != 'user-approved-upgrade-plan-6.7':
        raise ContractError('Missing scoped approval')
    student = int(plan['studentUid'])
    if student not in plan['authorizedStudentUids'] or student == plan['preservedSampleUid']:
        raise ContractError('Student outside action scope')
    body = plan['description']
    if digest(body) != plan['descriptionSha256'] or not 1 <= len(body) <= 4000:
        raise ContractError('Reviewed content changed')
    attempt_file = 'attempted.json' if args.attempt == 1 else 'attempted-2.json'
    if args.attempt == 2:
        rejection = json.loads((PRIVATE / 'rejection-1.json').read_text())
        if rejection.get('state') != 'rejected-no-submission-readback-verified' or rejection.get('actionId') != plan['id'] or rejection.get('businessCode') != 104 or plan.get('recoveryRevision') != 2:
            raise ContractError('Recovery requires confirmed rejection and reviewed revision')
    if (PRIVATE / attempt_file).exists():
        raise ContractError('Submission already attempted; read back before any further action')
    before = bff_detail()
    if before['version'] != plan['beforeVersion']:
        raise ContractError('Activity or learner data changed since proposal')
    activity = before['activity']
    target = next(s for s in before['students'] if int(s['id']) == student)
    if target['status'] != '未提交' or not activity['published'] or activity.get('cancelled'):
        raise ContractError('Task is not an open unsubmitted assignment')
    from datetime import datetime
    if not datetime.fromisoformat(activity['startsAt'].replace('Z', '+00:00')).timestamp() <= time.time() < datetime.fromisoformat(activity['endsAt'].replace('Z', '+00:00')).timestamp():
        raise ContractError('Outside actual assignment time')
    spec = importlib.util.spec_from_file_location('classin_api', ROOT / 'reference/classin-api/scripts/classin_api.py')
    api = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api)
    uid, secret = api.load_credential(TEACHER)

    def teacher(path, fields, form=True):
        payload = urllib.parse.urlencode(fields) if form else json.dumps(fields)
        return read_response(api.build_request(path, payload, form, uid, secret, HOST, None))

    def learner(path, fields, ticket):
        request = urllib.request.Request(HOST + path, data=urllib.parse.urlencode(fields).encode(), method='POST', headers={
            'Authorization': 'Bearer ' + ticket, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'classin-submission-canary/1.0',
        })
        return read_response(request)

    source, _ = teacher('/lms/app/activity/homework/get', {'activityId': ACTIVITY, 'courseId': COURSE})
    expected = {'id': ACTIVITY, 'courseId': COURSE, 'categoryId': CATEGORY, 'bizId': int(activity['bizId']), 'unitId': int(activity['unitId']), 'schoolUid': TEACHER}
    if any(source.get(k) != v for k, v in expected.items()):
        raise ContractError('Task ownership mismatch')
    members, _ = teacher('/course/app/getCourseMember', {'SID': TEACHER, 'clientCourseId': COURSE, 'identity': [1, 2]}, False)
    member = next((m for m in members if m['memberUid'] == student and m['identity'] == 1), None)
    if not member:
        raise ContractError('Student not in current authorized class')
    # Current gateway requires JSON+teacher JWT here; documented form probe was rejected.
    login, login_code = teacher('/zero-user-wx/mini/rpc/getLoginTicket', {'uid': student}, False)
    if not login.get('login_ticket') or login.get('time_unix', 0) <= time.time() or not member.get('mobile') or str(login.get('mobile')) != str(member['mobile']):
        raise ContractError('Login identity or expiry mismatch')
    ticket = login['login_ticket']
    _, check_code = learner('/lms/web/activity/homework/userCheck', {'activityId': ACTIVITY}, ticket)
    own, _ = learner('/lms/web/activity/homework/student/detail', {'shareParam': source['shareParam']}, ticket)
    if own.get('studentUid') != student or own.get('activityId') != ACTIVITY or own.get('status') != 0 or own.get('content'):
        raise ContractError('Student identity changed or existing work found')
    if any(own.get(kind) for kind in ['image', 'video', 'audio', 'docs']):
        raise ContractError('Existing student attachments must be preserved')
    probe = {'actionId': plan['id'], 'at': time.time(), 'loginCode': login_code, 'permissionCode': check_code, 'studentIdentityVerified': True, 'unsubmittedVerified': True, 'beforeVersion': before['version']}
    save('execution-probe.json', probe)
    if not args.execute:
        print(json.dumps(probe))
        return
    # Re-read immediately before the sole business write. An uncertain result is never retried.
    if bff_detail()['version'] != before['version']:
        raise ContractError('Data changed before submit')
    fields = {'activityId': ACTIVITY, 'description': body, **{kind: '[]' for kind in ['image', 'video', 'audio', 'docs']}, 'info': json.dumps({'type': 'postHomeworkDoInfo', 'role': 'student'}), 'correct': '0', 'wrong': '0', 'admire': '0'}
    save(attempt_file, {'actionId': plan['id'], 'attempt': args.attempt, 'descriptionSha256': digest(body), 'at': time.time(), 'state': 'attempted-result-unconfirmed', 'requestFieldsSha256': digest(json.dumps(fields, sort_keys=True))}, exclusive=True)
    try:
        result, code = learner('/lms/web/activity/homework/student/submit', fields, ticket)
    except ContractError as error:
        save('execution-receipt.json', {'kind': 'ExecutionReceipt', 'actionId': plan['id'], 'attempt': args.attempt, 'at': time.time(), 'businessCode': error.business_code, 'state': 'business-rejected-needs-readback'})
        raise
    save('execution-receipt.json', {'kind': 'ExecutionReceipt', 'actionId': plan['id'], 'attempt': args.attempt, 'at': time.time(), 'businessCode': code, 'state': 'accepted-awaiting-readback', 'resultFields': list(result) if isinstance(result, dict) else []})
    own_after, _ = learner('/lms/web/activity/homework/student/detail', {'shareParam': source['shareParam']}, ticket)
    after = bff_detail()
    if own_after.get('studentUid') != student or own_after.get('status') != 1 or own_after.get('content') != body:
        raise ContractError('Student submitted content readback mismatch; do not resubmit')
    actual = next(s for s in after['students'] if int(s['id']) == student)
    if actual['status'] != '已提交待批阅' or actual.get('submission', {}).get('status') != 'available':
        raise ContractError('Teacher readback pending; do not resubmit')
    save('after-detail.json', after)
    before_missing = [s['id'] for s in before['students'] if s['status'] == '未提交']
    after_missing = [s['id'] for s in after['students'] if s['status'] == '未提交']
    if set(after_missing) != set(before_missing) - {str(student)}:
        raise ContractError('Unexpected pending learner set change')
    receipt = {'kind': 'ExecutionReceipt', 'actionId': plan['id'], 'attempt': args.attempt, 'at': time.time(), 'businessCode': code, 'state': 'student-and-teacher-readback-verified',
               'studentUid': student, 'activityId': ACTIVITY, 'studentSubmittedAt': own_after.get('lastSubmitTime'), 'descriptionSha256': digest(body),
               'beforePending': before_missing, 'afterPending': after_missing, 'beforeVersion': before['version'], 'afterVersion': after['version']}
    save('execution-receipt.json', receipt)
    print(json.dumps({'state': receipt['state'], 'beforePendingCount': len(before_missing), 'afterPendingCount': len(after_missing)}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # HTTP errors can contain provider URLs; only known contract messages are safe.
        print(str(error) if isinstance(error, ContractError) else f'Canary stopped: {type(error).__name__}; inspect private receipts before retrying', file=sys.stderr)
        sys.exit(1)
