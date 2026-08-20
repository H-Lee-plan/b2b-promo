import './ConsentCheckbox.css';

const LABEL = {
  member: '개인정보 사용 동의',
  guest: '개인정보 수집·이용 및 보유기간 동의',
};

export default function ConsentCheckbox({ checked, onChange, variant = 'guest' }) {
  return (
    <label className="consent-checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {LABEL[variant]}
        <br />
        <small className="consent-checkbox__notice">(보유기간: 이벤트 종료일로부터 1년)</small>
      </span>
    </label>
  );
}
