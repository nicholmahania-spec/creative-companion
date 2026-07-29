// Authored preview for Button. Owned by humans — the converter never rewrites
// this file. Each named export renders as one labeled cell on the DS card.
//
// Content is deliberately drawn from the product's real vocabulary (briefs,
// clients, projects) rather than "Button one" / "foo" — these cells are both
// browsed by people and imitated by the design agent.
import * as React from 'react';
import { Button } from 'creative-companion-react';

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
};

/** The default call to action — solid fill, the one primary action per screen. */
export const Primary = () => <Button variant="primary">Send to client</Button>;

/**
 * The full variant axis. `outline` is an alias of `secondary` in the component
 * (both render `.btn-secondary`), so those two cells are expected to match.
 */
export const Variants = () => (
  <div style={row}>
    <Button variant="primary">Send to client</Button>
    <Button variant="secondary">Save draft</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="outline">Duplicate</Button>
  </div>
);

/** Two rendered sizes: `md` (default) and `sm`. `soft` is an alias of `sm`. */
export const Sizes = () => (
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
export const Disabled = () => (
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
export const ActionRow = () => (
  <div style={{ ...row, justifyContent: 'flex-end', gap: '0.5rem' }}>
    <Button variant="ghost">Back</Button>
    <Button variant="primary">Approve and continue</Button>
  </div>
);
