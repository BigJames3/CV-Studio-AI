import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, RequestContext } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  OAuthGoogleDto,
  OAuthLinkedInDto,
  OAuthAppleDto,
  TwoFactorVerifyDto,
  TwoFactorDisableDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { CurrentUser, Public, AuthUser } from '../../common/decorators';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './auth-cookies';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private ctx(req: Request): RequestContext {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    return {
      ip,
      userAgent: req.headers['user-agent'],
    };
  }

  private attachCookies(res: Response, refreshToken: string) {
    setAuthCookies(res, refreshToken);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register with email/password' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokens = await this.auth.register(dto, this.ctx(req));
    this.attachCookies(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.auth.login(dto, this.ctx(req));
    if ('requires2fa' in result) return result;
    this.attachCookies(res, result.refreshToken);
    return result;
  }

  @ApiBearerAuth('JWT')
  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AuthUser,
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const cookieToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? body.refreshToken;
    const result = await this.auth.logout(user.id, cookieToken, this.ctx(req));
    clearAuthCookies(res);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const token =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? dto.refreshToken ?? '';
    const tokens = await this.auth.refresh(token, this.ctx(req));
    this.attachCookies(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('oauth/google')
  @HttpCode(200)
  async oauthGoogle(
    @Body() dto: OAuthGoogleDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokens = await this.auth.oauthGoogle(dto, this.ctx(req));
    this.attachCookies(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('oauth/linkedin')
  @HttpCode(200)
  async oauthLinkedIn(
    @Body() dto: OAuthLinkedInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokens = await this.auth.oauthLinkedIn(dto, this.ctx(req));
    this.attachCookies(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('oauth/apple')
  @HttpCode(200)
  oauthApple(@Body() dto: OAuthAppleDto) {
    return this.auth.oauthApple(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/enable')
  enable2fa(@CurrentUser() user: AuthUser) {
    return this.auth.enable2fa(user.id);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/verify')
  verify2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorVerifyDto) {
    return this.auth.verify2fa(user.id, dto.code);
  }

  @ApiBearerAuth('JWT')
  @Post('2fa/disable')
  @HttpCode(200)
  disable2fa(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorDisableDto) {
    return this.auth.disable2fa(user.id, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(dto.email, this.ctx(req));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(dto, this.ctx(req));
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    return this.auth.verifyEmail(dto.token, this.ctx(req));
  }

  @ApiBearerAuth('JWT')
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.auth.resendVerification(user.id, this.ctx(req));
  }

  @ApiBearerAuth('JWT')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (alias of GET /users/me)' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.auth.getProfile(user.id);
  }

  @ApiBearerAuth('JWT')
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile (alias of PATCH /users/me)' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @ApiBearerAuth('JWT')
  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Change password while authenticated' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request
  ) {
    return this.auth.changePassword(user.id, dto, this.ctx(req));
  }

  @ApiBearerAuth('JWT')
  @Get('sessions')
  listSessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user.id);
  }

  @ApiBearerAuth('JWT')
  @Delete('sessions/:id')
  revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.auth.revokeSession(user.id, id);
  }
}
