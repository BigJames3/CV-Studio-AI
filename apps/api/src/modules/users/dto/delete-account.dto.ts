import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Deleting the account is irreversible: the caller proves it again, beyond the access token. */
export class DeleteAccountDto {
  @ApiPropertyOptional({ description: 'Required when the account has a password' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ description: 'Account e-mail, required for OAuth-only accounts' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  confirmEmail?: string;
}
