// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readClassInReplay, authorizeClassInReplay } from './classin-test-replay';
import { ClassInError, TEST_SCOPE, type ClassInTransport } from './classin-test-transport';
const file = { FileId: 'PRIVATE-FILE-ID', Status: '2', Duration: 1707, StartTimestamp: 1789386409, EndTimestamp: 1789388114, CreateTimestamp: 1789388420, Playset: [{ url: 'PRIVATE-PLAYBACK-URL' }] };
const source = { lessonId: 1002, teacherUid: TEST_SCOPE.uid, teacherId: 123456, lessonData: { fileList: [file] }, lessonCode: 'PRIVATE-CODE', playbackDetail: { canPlay: 1, canShow: 0 } };
function transport(value: unknown = source) { return vi.fn<ClassInTransport>(async () => value); }
describe('classroom replay metadata', () => {
  it('queries the scoped teacher and classroom and strips all playback credentials', async () => {
    const read = transport(); const result = await readClassInReplay(read, '1002');
    expect(read).toHaveBeenCalledWith('/api/classin.api.php?action=getLessonRecordInfo', { SID: TEST_SCOPE.schoolId, clientCourseId: TEST_SCOPE.classId, clientClassId: '1002', memberUid: TEST_SCOPE.uid });
    expect(result).toMatchObject({ state: 'files_returned', files: [{ durationSeconds: 1707, startsAt: '2026-09-14T11:46:49.000Z', endsAt: '2026-09-14T12:15:14.000Z' }] });
    expect(result.message).toContain('未取得可用的教师播放引用');
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|Playset|lessonCode|teacherId|canPlay/);
  });
  it('grants only the current file and teacher playback permission without exposing its URL', async () => {
    const playable = { ...source, showClassVideo: 1, avoidRecordReplay: 0, avoidRecordVideoRecorded: 0,
      lessonData: { fileList: [{ ...file, Size: 1000, Playset: [{ Definition: '0', Url: 'https://playback.eeo.im/fixture/replay.mp4' }] }] } };
    const result = await readClassInReplay(transport(playable), '1002'); const ref = result.files[0]!.playbackRef!;
    expect(ref).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(result)).not.toMatch(/https:|PRIVATE/);
    expect(await authorizeClassInReplay(transport(playable), '1002', ref)).toMatchObject({ size: 1000 });
    for (const change of [{ playbackDetail: { canPlay: 0 } }, { avoidRecordReplay: 1 }, { showClassVideo: 0 }]) await expect(authorizeClassInReplay(transport({ ...playable, ...change }), '1002', ref)).rejects.toMatchObject({ code: 'forbidden' });
    const changed = { ...playable, lessonData: { fileList: [{ ...playable.lessonData.fileList[0], Size: 1001 }] } };
    await expect(authorizeClassInReplay(transport(changed), '1002', ref)).rejects.toMatchObject({ code: 'forbidden' });
    for (const url of ['http://playback.eeo.im/a.mp4', 'https://evil.test/a.mp4', 'https://playback.eeo.im/../a.mp4', 'https://playback.eeo.im/a.mp4?token=x']) {
      const invalid = { ...playable, lessonData: { fileList: [{ ...playable.lessonData.fileList[0], Playset: [{ Definition: '0', Url: url }] }] } };
      expect((await readClassInReplay(transport(invalid), '1002')).files[0]!.playbackRef).toBeUndefined();
    }
  });
  it.each([[], {}])('retains a valid empty lessonData without treating canPlay as a recording', async (lessonData) => {
    expect(await readClassInReplay(transport({ ...source, lessonData }), '1002')).toMatchObject({ state: 'empty', files: [] });
  });
  it('rejects foreign lesson or teacher before exposing any file', async () => {
    for (const change of [{ lessonId: 9999 }, { teacherUid: 'other' }]) await expect(readClassInReplay(transport({ ...source, ...change }), '1002')).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('keeps unknown state codes as data and never labels them processing or playable', async () => {
    const result = await readClassInReplay(transport({ ...source, lessonData: { fileList: [{ ...file, Status: '999', Duration: null, StartTimestamp: 0, EndTimestamp: 0 }] } }), '1002');
    expect(result.files[0]).toMatchObject({ statusCode: '999', durationSeconds: null, startsAt: null, endsAt: null });
    expect(result.message).not.toMatch(/转换中|可以播放|已处理完成/);
  });
  it('keeps network failures, malformed and duplicate lists distinct from empty', async () => {
    const badFiles = [[file, file], [{ ...file, Duration: 1789386409000 }], [{ ...file, EndTimestamp: 1789386000 }]];
    const values = [{ ...source, lessonData: null }, { ...source, lessonData: { lessonStatus: 1 } }, ...badFiles.map((fileList) => ({ ...source, lessonData: { fileList } }))];
    for (const value of values) expect(await readClassInReplay(transport(value), '1002')).toMatchObject({ state: 'unavailable', files: [] });
    expect(await readClassInReplay(vi.fn(async () => { throw new ClassInError('timeout', 'timed out'); }), '1002')).toMatchObject({ state: 'unavailable', files: [] });
  });
});
