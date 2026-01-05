import { Module } from '@nestjs/common';
import { AppController } from './infra/http/controllers/app.controller';
import { HttpModule } from './infra/http/http.module';

@Module({
  imports: [HttpModule],
})
export class AppModule { }
