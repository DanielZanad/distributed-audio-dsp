import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { DatabaseModule } from '@infra/database/database.module';
import { FindUserByEmail } from '@app/use-cases/find-user-by-email';
import { UserController } from './controllers/user.controller';
import { RegisterUser } from '@app/use-cases/register-user';
import { AuthController } from './controllers/auth.controller';
import { AuthModule } from './auth/auth.module';
import { AudioController } from './controllers/audio.controller';
import { AudioOutputStorageService } from '@infra/storage/audio-output-storage.service';
import { ProcessAudio } from '@app/use-cases/process-audio';
import { ListAudioJobs } from '@app/use-cases/list-audio-jobs';
import { FindAudioJobById } from '@app/use-cases/find-audio-job-by-id';
import { GetAudioOutputFile } from '@app/use-cases/get-audio-output-file';
import { AudioInputStorage } from '@app/storage/audio-input-storage';
import { LocalAudioInputStorageService } from '@infra/storage/local-audio-input-storage.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AppController, UserController, AuthController, AudioController],
  providers: [
    FindUserByEmail,
    RegisterUser,
    ProcessAudio,
    ListAudioJobs,
    FindAudioJobById,
    GetAudioOutputFile,
    AudioOutputStorageService,
    {
      provide: AudioInputStorage,
      useClass: LocalAudioInputStorageService,
    },
  ]
})
export class HttpModule { }
