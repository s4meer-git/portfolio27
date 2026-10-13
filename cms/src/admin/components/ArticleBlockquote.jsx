import * as React from 'react';
import { useField, useNotification } from '@strapi/strapi/admin';
import { useDocumentRBAC } from '@strapi/content-manager/strapi-admin';
import { Box, Button, Field, Flex, Modal, SingleSelect, SingleSelectOption, Textarea, TextInput, Typography } from '@strapi/design-system';
import styled from 'styled-components';
import { blockquoteMarkdown, blockquotePositions, insertBlockquote } from '../blockquote-markdown.mjs';

const Preview = styled.blockquote`
  position: relative;
  margin: 16px;
  padding: 8px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: ${({ $align }) => $align === 'center' ? 'center' : $align === 'end' ? 'flex-end' : 'flex-start'};
  border-inline-start: ${({ $variant }) => $variant === 'plain' ? '0' : '4px solid'};
  border-color: ${({ theme, $variant }) => $variant === 'solid' ? theme.colors.neutral800 : theme.colors.neutral200};
  color: ${({ theme }) => theme.colors.neutral800};
  text-align: ${({ $align }) => $align};
  overflow-wrap: anywhere;
  p { font-size: ${({ $kind }) => $kind === 'QUESTION' ? '20px' : '16px'}; line-height: 1.65; font-weight: ${({ $kind }) => $kind === 'QUESTION' ? 600 : 400}; font-style: italic; white-space: pre-wrap; }
  svg { display: block; flex: none; width: ${({ $kind }) => $kind === 'QUESTION' ? '34px' : '32px'}; height: ${({ $kind }) => $kind === 'QUESTION' ? '45px' : '32px'}; color: ${({ theme }) => theme.colors.neutral600}; }
  footer { font-size: 14px; color: ${({ theme }) => theme.colors.neutral600}; }
`;

function Select({ label, value, onChange, options }) {
  return <Field.Root><Field.Label>{label}</Field.Label><SingleSelect value={value} onChange={onChange}>
    {options.map(option => <SingleSelectOption key={option.value} value={option.value}>{option.label}</SingleSelectOption>)}
  </SingleSelect></Field.Root>;
}

function Composer({ disabled }) {
  const { value, onChange } = useField('body');
  const body = typeof value === 'string' ? value : '';
  const { toggleNotification } = useNotification();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState('QUESTION');
  const [variant, setVariant] = React.useState('plain');
  const [align, setAlign] = React.useState('center');
  const [text, setText] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [source, setSource] = React.useState('');
  const [position, setPosition] = React.useState('end');
  const [error, setError] = React.useState('');
  const insert = () => {
    if (disabled) return;
    try {
      const quote = blockquoteMarkdown({ kind, variant, align, text, author, source });
      onChange('body', insertBlockquote(body, quote, position));
      setOpen(false); setText(''); setAuthor(''); setSource(''); setError(''); setPosition('end');
      toggleNotification({ type: 'success', message: 'Blockquote inserted. Save your article when ready.' });
    } catch (err) { setError(err.message); }
  };
  return <Flex direction="column" alignItems="stretch" gap={3} width="100%">
    <Typography variant="pi" textColor="neutral600">Add a reader question or an attributed quote between article sections.</Typography>
    <Modal.Root open={open} onOpenChange={setOpen}>
      <Modal.Trigger><Button variant="secondary" disabled={disabled} type="button" fullWidth>Insert blockquote</Button></Modal.Trigger>
      <Modal.Content>
        <Modal.Header><Modal.Title>Insert blockquote</Modal.Title></Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Select label="Type" value={kind} onChange={value => { setKind(value); setVariant(value === 'QUESTION' ? 'plain' : 'subtle'); setAlign(value === 'QUESTION' ? 'center' : 'start'); }} options={[{ value: 'QUESTION', label: 'Reader question' }, { value: 'QUOTE', label: 'Quotation' }]} />
            <Field.Root><Field.Label>{kind === 'QUESTION' ? 'Question text' : 'Quote text'}</Field.Label><Textarea value={text} onChange={event => setText(event.target.value)} /></Field.Root>
            <Flex gap={4} alignItems="stretch">
              <Box flex="1"><Select label="Style" value={variant} onChange={setVariant} options={['subtle','solid','plain'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></Box>
              <Box flex="1"><Select label="Alignment" value={align} onChange={setAlign} options={[{ value: 'start', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'end', label: 'Right' }]} /></Box>
            </Flex>
            <Field.Root><Field.Label>Attribution (optional)</Field.Label><TextInput value={author} onChange={event => setAuthor(event.target.value)} /></Field.Root>
            <Field.Root><Field.Label>Source URL (optional)</Field.Label><TextInput value={source} onChange={event => { setSource(event.target.value); setError(''); }} placeholder="https://example.com/source" /></Field.Root>
            <Select label="Placement" value={position} onChange={setPosition} options={blockquotePositions(body)} />
            <Box background="neutral0" padding={4} borderColor="neutral200" hasRadius>
              <Typography variant="sigma" textColor="neutral600">Preview</Typography>
              <Preview $kind={kind} $variant={variant} $align={align}>
                <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" aria-hidden="true">{kind === 'QUESTION'
                  ? <><path d="M5 9a7 7 0 0 1 14 0c0 4-7 4-7 9v2" strokeWidth="1.4" strokeLinecap="round" /><circle cx="12" cy="27" r="1.4" strokeWidth="1.4" /></>
                  : <path d="M10 6H4v7h5c0 3-1 4-4 5M21 6h-6v7h5c0 3-1 4-4 5" strokeWidth="1.4" strokeLinecap="round" />}</svg>
                <p>{text || (kind === 'QUESTION' ? 'What would you try next?' : 'Your quotation appears here.')}</p>
                {author || source ? <footer>{author || source}</footer> : null}
              </Preview>
            </Box>
            {error ? <Typography textColor="danger600" role="alert">{error}</Typography> : null}
          </Flex>
        </Modal.Body>
        <Modal.Footer><Modal.Close><Button type="button" variant="tertiary">Cancel</Button></Modal.Close><Button type="button" disabled={disabled || !text.trim()} onClick={insert}>Insert into article</Button></Modal.Footer>
      </Modal.Content>
    </Modal.Root>
    {disabled ? <Typography variant="pi" textColor="neutral600">Open an editable draft to insert a blockquote.</Typography> : null}
  </Flex>;
}

export default function ArticleBlockquotePanel({ model, activeTab, documentId }) {
  const rbac = useDocumentRBAC('ArticleBlockquote', state => state);
  if (model !== 'api::article.article') return null;
  const fields = documentId ? rbac.canUpdateFields : rbac.canCreateFields;
  const canEdit = (documentId ? rbac.canUpdate : rbac.canCreate) && (!fields.length || fields.includes('body'));
  return { title: 'Blockquotes', content: <Composer disabled={activeTab === 'published' || !canEdit} /> };
}
