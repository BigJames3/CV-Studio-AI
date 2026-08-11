'use client';

import { useLogout } from '@/hooks';
import { Button } from '@/components/ui/button';

type LogoutButtonProps = {
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
};

export function LogoutButton({
  className,
  variant = 'destructive',
  size = 'md',
  label = 'Se déconnecter',
}: LogoutButtonProps) {
  const logout = useLogout();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={logout.isPending}
      data-testid="logout-button"
      onClick={() => logout.mutate()}
    >
      {logout.isPending ? 'Déconnexion…' : label}
    </Button>
  );
}
