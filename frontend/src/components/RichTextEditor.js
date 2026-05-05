import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link',
];

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
};

function RichTextEditor({ value, onChange, placeholder, className = '' }) {
  const modules = useMemo(() => defaultModules, []);

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || ''}
      />
    </div>
  );
}

export default RichTextEditor;
