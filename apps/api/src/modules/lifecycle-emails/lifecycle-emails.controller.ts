import { BadRequestException, Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { LifecycleEmailsService } from './lifecycle-emails.service';
import { verifyUnsubscribe } from './unsubscribe-token';

@ApiTags('Emails')
@Controller('emails')
export class LifecycleEmailsController {
  constructor(private readonly emails: LifecycleEmailsService) {}

  /**
   * Stops reminder and tip e-mails. Public: the signed link is the proof. Called by the
   * /desinscription page (u and t in the JSON body) and by mail clients' one-click
   * List-Unsubscribe (RFC 8058: u and t in the query, form body "List-Unsubscribe=One-Click").
   */
  @Public()
  @Post('unsubscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'One-click unsubscribe from lifecycle e-mails (signed link)' })
  async unsubscribe(
    @Query('u') queryUser?: string,
    @Query('t') queryToken?: string,
    @Body() body?: Record<string, unknown>
  ) {
    const userId = queryUser ?? (typeof body?.u === 'string' ? body.u : undefined);
    const token = queryToken ?? (typeof body?.t === 'string' ? body.t : undefined);
    if (!verifyUnsubscribe(userId, token)) {
      throw new BadRequestException({
        code: 'INVALID_UNSUBSCRIBE_LINK',
        message: 'Ce lien de désinscription n’est pas valide.',
      });
    }
    await this.emails.unsubscribe(userId!);
    return { unsubscribed: true };
  }
}
