import * as React from 'react';
import {
  Box,
  Button,
  Field,
  Flex,
  Popover,
  Searchbar,
  Typography,
} from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ICON_NAMES, IconPreview, isKnownIcon } from '../icon-catalog';

const GRID_ID = 'icon-picker-grid';

/**
 * Custom field input for `global::icon-picker`.
 *
 * Strapi hands us `value`/`onChange(name, value)` from the surrounding form, plus the
 * usual field metadata. The stored value is the icon's name; the website looks that
 * name up in the very same catalog, so what is previewed here is what gets rendered.
 */
const IconPicker = React.forwardRef(
  ({ name, value, onChange, label, hint, error, required, disabled, labelAction }, ref) => {
    const { formatMessage } = useIntl();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const results = React.useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return ICON_NAMES;
      return ICON_NAMES.filter(icon => icon.toLowerCase().includes(term));
    }, [search]);

    const select = icon => {
      onChange(name, icon);
      setOpen(false);
      setSearch('');
    };

    // A name saved before the icon existed (or a typo from the old free-text field)
    // would silently fall back to a generic link on the website. Say so instead.
    const unknown = value && !isKnownIcon(value);

    return (
      <Field.Root name={name} id={name} error={error} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>

        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger>
            <Button
              variant="tertiary"
              disabled={disabled}
              ref={ref}
              fullWidth
              justifyContent="space-between"
            >
              <Flex gap={2} alignItems="center">
                {value && !unknown ? <IconPreview name={value} size={20} /> : null}
                <Typography textColor={value ? 'neutral800' : 'neutral600'}>
                  {value ||
                    formatMessage({
                      id: 'icon-picker.empty',
                      defaultMessage: 'No icon',
                    })}
                </Typography>
              </Flex>
            </Button>
          </Popover.Trigger>

          <Popover.Content side="bottom" align="start" sideOffset={4}>
            <Flex direction="column" alignItems="stretch" padding={3} gap={3} width="360px">
              <Searchbar
                name="icon-search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                onClear={() => setSearch('')}
                clearLabel={formatMessage({
                  id: 'icon-picker.clear-search',
                  defaultMessage: 'Clear search',
                })}
                placeholder={formatMessage({
                  id: 'icon-picker.search',
                  defaultMessage: 'Search logos, e.g. React',
                })}
                aria-controls={GRID_ID}
              >
                {formatMessage({ id: 'icon-picker.search', defaultMessage: 'Search logos' })}
              </Searchbar>

              <Box
                id={GRID_ID}
                maxHeight="280px"
                overflow="auto"
                role="listbox"
                aria-label={formatMessage({
                  id: 'icon-picker.results',
                  defaultMessage: 'Available logos',
                })}
              >
                {results.length === 0 ? (
                  <Box padding={4}>
                    <Typography textColor="neutral600">
                      {formatMessage(
                        {
                          id: 'icon-picker.no-results',
                          defaultMessage: 'No logo matches "{search}".',
                        },
                        { search: search.trim() }
                      )}
                    </Typography>
                  </Box>
                ) : (
                  <Flex wrap="wrap" gap={1} alignItems="flex-start">
                    {results.map(icon => (
                      <IconChoice
                        key={icon}
                        icon={icon}
                        selected={icon === value}
                        onSelect={select}
                      />
                    ))}
                  </Flex>
                )}
              </Box>

              <Button
                variant="tertiary"
                startIcon={<Cross />}
                onClick={() => select('')}
                disabled={!value}
              >
                {formatMessage({
                  id: 'icon-picker.remove',
                  defaultMessage: 'Remove icon',
                })}
              </Button>
            </Flex>
          </Popover.Content>
        </Popover.Root>

        {unknown ? (
          <Box paddingTop={1}>
            <Typography variant="pi" textColor="danger600">
              {formatMessage(
                {
                  id: 'icon-picker.unknown',
                  defaultMessage:
                    '"{value}" is not a known logo, so the website shows a generic link icon. Pick a logo above.',
                },
                { value }
              )}
            </Typography>
          </Box>
        ) : null}

        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

IconPicker.displayName = 'IconPicker';

const IconChoice = ({ icon, selected, onSelect }) => (
  <Box
    tag="button"
    type="button"
    role="option"
    aria-selected={selected}
    title={icon}
    onClick={() => onSelect(icon)}
    padding={2}
    width="64px"
    hasRadius
    background={selected ? 'primary100' : 'neutral0'}
    borderColor={selected ? 'primary600' : 'neutral200'}
    cursor="pointer"
  >
    <Flex direction="column" gap={1} alignItems="center">
      <IconPreview name={icon} size={22} />
      <Typography variant="pi" textColor="neutral600" ellipsis>
        {icon}
      </Typography>
    </Flex>
  </Box>
);

export default IconPicker;
