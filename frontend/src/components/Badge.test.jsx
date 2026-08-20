import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge.jsx';

describe('Badge', () => {
  it('전달된 텍스트를 표시하고 tone에 맞는 클래스를 적용한다', () => {
    render(<Badge tone="primary">진행중</Badge>);
    const badge = screen.getByText('진행중');
    expect(badge).toHaveClass('badge', 'badge--primary');
  });

  it('tone 미지정 시 neutral을 기본값으로 사용한다', () => {
    render(<Badge>등록</Badge>);
    expect(screen.getByText('등록')).toHaveClass('badge--neutral');
  });
});
