# Testing patterns — @cvstudio/ui

## Unit / component

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

it('is keyboard operable', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);
  await user.tab();
  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalled();
});

it('passes axe', async () => {
  const { container } = render(<Button>Save</Button>);
  expect(await axe(container)).toHaveNoViolations();
});
```

## Rules

- Assert **roles / names**, never Tailwind class strings
- Cover loading / disabled / error states
- Dark mode: render inside `.dark` wrapper when contrast-critical
- Visual regressions: Storybook stories are the contract

## CI

`pnpm --filter @cvstudio/ui test` on every PR touching `packages/ui`.
