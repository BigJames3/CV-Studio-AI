import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @MaxLength(128)
  event!: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  platform?: string;
}
