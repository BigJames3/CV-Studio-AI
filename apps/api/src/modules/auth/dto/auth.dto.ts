import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { PASSWORD_REGEX } from '@cvstudio/shared-utils';

const PASSWORD_MESSAGE =
  'Password must be ≥12 characters and include a letter, a number, and a special character';

export class RegisterDto {
  @ApiProperty({ example: 'lea@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'TOTP code when 2FA is enabled' })
  @IsOptional()
  @IsString()
  totp?: string;
}

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Required if not using httpOnly cookie' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class OAuthGoogleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class OAuthLinkedInDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  redirectUri!: string;

  @ApiPropertyOptional({ description: 'CSRF state issued by POST /auth/oauth/state' })
  @IsOptional()
  @IsString()
  state?: string;
}

export class CreateOAuthStateDto {
  @ApiProperty({ enum: ['google', 'linkedin'] })
  @IsString()
  @IsIn(['google', 'linkedin'])
  provider!: 'google' | 'linkedin';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  next?: string;
}

export class CompleteTwoFactorDto {
  @ApiProperty()
  @IsString()
  tempToken!: string;

  @ApiPropertyOptional({ description: 'TOTP code' })
  @IsOptional()
  @IsString()
  totp?: string;

  @ApiPropertyOptional({ description: 'One-time backup code' })
  @IsOptional()
  @IsString()
  backupCode?: string;
}

export class OAuthAppleDto {
  @ApiProperty()
  @IsString()
  idToken!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class TwoFactorVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

export class TwoFactorDisableDto {
  @ApiProperty({ example: '123456', description: 'TOTP or backup code to confirm disable' })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  token!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Public HTTPS avatar URL; empty string clears' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @MaxLength(2048)
  @Matches(/^https?:\/\/.+/, { message: 'avatarUrl must be an http(s) URL' })
  avatarUrl?: string | null;
}
