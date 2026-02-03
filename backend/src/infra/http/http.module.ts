import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { DatabaseModule } from '@infra/database/database.module';
import { FindUserByEmail } from '@app/use-cases/find-user-by-email';
import { UserController } from './controllers/user.controller';
import { RegisterUser } from '@app/use-cases/register-user';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AppController, UserController, AuthController],
  providers: [FindUserByEmail, RegisterUser]
})
export class HttpModule { }
