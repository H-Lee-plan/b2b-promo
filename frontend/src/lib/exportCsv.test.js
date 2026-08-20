import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from './exportCsv.js';

describe('downloadBlob', () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Blob URL을 생성해 지정한 파일명으로 다운로드를 트리거하고 URL을 정리한다', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['csv content'], { type: 'text/csv' });

    downloadBlob(blob, 'entries-e1.csv');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('생성한 앵커 요소를 DOM에서 다시 제거한다', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    downloadBlob(new Blob(['x']), 'file.csv');

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });
});
