import "../styles/_textareafield.scss";
import { useState } from "react";

/**
 * @name TextAreaField
 * @description Reusable labeled textarea with a live character count. Used for both self-description and job description.
 * @access Public
 */
function TextAreaField({ value, onChange, placeholder, maxLength }) {
  const [charCount, setCharCount] = useState(value.length);

  /**
   * @name handleChange
   * @description Updates the value and keeps the character count in sync.
   * @access Private
   */
  const handleChange = (event) => {
    onChange(event.target.value);
    setCharCount(event.target.value.length);
  };

  return (
    <div className="text-area-field">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <div className="text-area-field__count">
        {charCount} / {maxLength}
      </div>
    </div>
  );
}

export default TextAreaField;