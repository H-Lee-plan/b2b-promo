import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormFieldsInput from './FormFieldsInput.jsx';

describe('FormFieldsInput', () => {
  it('전달된 필드명마다 입력칸을 렌더링한다', () => {
    render(<FormFieldsInput fields={['회사명', '요청사항']} values={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('회사명')).toBeInTheDocument();
    expect(screen.getByLabelText('요청사항')).toBeInTheDocument();
  });

  it('values에 있는 값을 입력칸에 채운다', () => {
    render(<FormFieldsInput fields={['회사명']} values={{ 회사명: 'OO식자재' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('회사명')).toHaveValue('OO식자재');
  });

  it('입력 변경 시 onChange가 필드명과 값을 전달한다', () => {
    const onChange = vi.fn();
    render(<FormFieldsInput fields={['요청사항']} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('요청사항'), { target: { value: '빠른 배송 부탁드려요' } });
    expect(onChange).toHaveBeenCalledWith('요청사항', '빠른 배송 부탁드려요');
  });

  it('필드가 없으면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<FormFieldsInput fields={[]} values={{}} onChange={vi.fn()} />);
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });
});
