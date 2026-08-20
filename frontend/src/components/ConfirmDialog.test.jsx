import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('open이 false면 아무것도 렌더링하지 않는다', () => {
    render(<ConfirmDialog open={false} title="제목" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('open이 true면 title/message를 표시한다', () => {
    render(
      <ConfirmDialog open title="이벤트를 종료할까요?" message="되돌릴 수 없습니다." onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent('이벤트를 종료할까요?');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('되돌릴 수 없습니다.');
  });

  it('확인 버튼 클릭 시 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="제목" confirmLabel="종료" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '종료' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('취소 버튼 또는 스크림 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('다이얼로그 내부 클릭은 onCancel(스크림 클릭)로 전파되지 않는다', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="제목" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('alertdialog'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
