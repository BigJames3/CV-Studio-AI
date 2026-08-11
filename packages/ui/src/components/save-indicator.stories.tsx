import type { Meta, StoryObj } from '@storybook/react';
import { SaveIndicator } from '../components/save-indicator';

const meta: Meta<typeof SaveIndicator> = {
  title: 'Product/SaveIndicator',
  component: SaveIndicator,
};

export default meta;
type Story = StoryObj<typeof SaveIndicator>;

export const Saved: Story = { args: { status: 'saved' } };
export const Saving: Story = { args: { status: 'saving' } };
export const Error: Story = { args: { status: 'error' } };
