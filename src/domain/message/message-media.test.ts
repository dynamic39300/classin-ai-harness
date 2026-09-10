import { describe, expect, it } from 'vitest';
import {
  getMessageContentPreview,
  getMessageMediaPreview,
  reconcileMessageMentions,
  type MessageMediaAttachment,
} from './message-media';

const IMAGE: MessageMediaAttachment = Object.freeze({
  id: 'image-1',
  kind: 'image',
  name: '实验图.png',
  mimeType: 'image/png',
  byteSize: 12,
  contentRef: '/media/experiment.png',
  source: 'fixture',
});

describe('message media domain', () => {
  it('creates stable list and reply previews for media-only messages', () => {
    expect(getMessageMediaPreview([IMAGE])).toBe('[图片]');
    expect(getMessageMediaPreview([IMAGE, { ...IMAGE, id: 'image-2' }])).toBe('[图片 2 张]');
    expect(getMessageContentPreview({ body: '', attachments: [IMAGE] })).toBe('[图片]');
  });

  it('keeps only mentions that remain in the edited body', () => {
    const mentions = [
      { id: 'everyone', kind: 'everyone' as const, label: '所有人' },
      { id: 'student-1', kind: 'person' as const, label: '李明', actorId: 'student-1' },
    ];
    expect(reconcileMessageMentions('@所有人 请看图', mentions)).toEqual([mentions[0]]);
  });
});
