Button from creative-companion-react. Use via `window.CreativeCompanion.Button` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonProps {
children?: React.ReactNode; /** Visual weight. 'outline' is an alias of 'secondary' — both render .btn-secondary. */ variant?: 'primary' | 'secondary' | 'ghost' | 'outline'; /** 'sm' and 'soft' both render .btn-sm; 'md' adds no size class. */ size?: 'md' | 'sm' | 'soft'; /** Appended after the .btn/.btn-* classes, so it wins on conflicts. */ className?: string; onClick?: React.MouseEventHandler<HTMLButtonElement>; /** Any other button attribute is spread onto the underlying <button>. Note the element defaults to type="button"; pass type="submit" to override. */ [key: string]: unknown;
}
```

## Examples

### Primary

```jsx
() => <Button variant="primary">Send to client</Button>;

/**
 * The full variant axis. `outline` is an alias of `secondary` in the component
 * (both render `.btn-secondary`), so those two cells are expected to match.
 */
```

### Variants

```jsx
() => (
  <div style={row}>
    <Button variant="primary">Send to client</Button>
    <Button variant="secondary">Save draft</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="outline">Duplicate</Button>
  </div>
);

/** Two rendered sizes: `md` (default) and `sm`. `soft` is an alias of `sm`. */
```

### Sizes

```jsx
() => (
  <div style={row}>
    <Button variant="primary" size="md">
      Export brand pack
    </Button>
    <Button variant="primary" size="sm">
      Export
    </Button>
  </div>
);

/** Disabled across variants — dimmed fill, cursor suppressed. */
```

### Disabled

```jsx
() => (
  <div style={row}>
    <Button variant="primary" disabled>
      Send to client
    </Button>
    <Button variant="secondary" disabled>
      Save draft
    </Button>
    <Button variant="ghost" disabled>
      Cancel
    </Button>
  </div>
);

/**
 * A realistic action row: one primary action, one quiet escape. This is the
 * intended pairing — a screen gets a single primary, never two competing ones.
 */
```

### ActionRow

```jsx
() => (
  <div style={{ ...row, justifyContent: 'flex-end', gap: '0.5rem' }}>
    <Button variant="ghost">Back</Button>
    <Button variant="primary">Approve and continue</Button>
  </div>
)
```
