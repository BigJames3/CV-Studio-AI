import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/button';

const meta: Meta<typeof Button> = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Continue' },
  parameters: { a11y: { test: 'error' } },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Loading: Story = { args: { loading: true } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete' } };
