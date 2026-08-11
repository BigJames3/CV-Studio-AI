import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/input';
import { Label } from '../components/label';

const meta: Meta<typeof Input> = {
  title: 'Forms/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: (args) => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" placeholder="you@company.com" {...args} />
    </div>
  ),
};
