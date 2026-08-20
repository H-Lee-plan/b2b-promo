export default function FormFieldsInput({ fields, values, onChange }) {
  return (
    <>
      {fields.map((field) => (
        <label key={field}>
          {field}
          <input value={values[field] ?? ''} onChange={(event) => onChange(field, event.target.value)} required />
        </label>
      ))}
    </>
  );
}
