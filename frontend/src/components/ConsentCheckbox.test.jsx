import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentCheckbox from './ConsentCheckbox.jsx';

describe('ConsentCheckbox', () => {
  it('회원용 문구와 보유기간 1년 고지를 함께 보여준다', () => {
    render(<ConsentCheckbox variant="member" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('개인정보 사용 동의')).toBeInTheDocument();
    expect(screen.getByText(/보유기간: 이벤트 종료일로부터 1년/)).toBeInTheDocument();
  });

  it('비회원용 문구와 보유기간 1년 고지를 함께 보여준다', () => {
    render(<ConsentCheckbox variant="guest" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('개인정보 수집·이용 및 보유기간 동의')).toBeInTheDocument();
    expect(screen.getByText(/보유기간: 이벤트 종료일로부터 1년/)).toBeInTheDocument();
  });

  it('체크 시 onChange가 true로 호출된다', () => {
    const onChange = vi.fn();
    render(<ConsentCheckbox variant="guest" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
