import { AudioInputStorage, StoreUploadedAudioInputRequest } from "@app/storage/audio-input-storage";
import { Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";

@Injectable()
export class LocalAudioInputStorageService implements AudioInputStorage {
    async storeUploadedInput(request: StoreUploadedAudioInputRequest) {
        const extension = extname(request.file.originalname).slice(0, 16) || ".bin";
        const uploadsRoot = join(
            process.env.LOCAL_AUDIO_STORAGE_ROOT ?? "/app/data",
            "inputs",
            request.userId,
        );
        const storedFileName = `${request.jobId}${extension.toLowerCase()}`;
        const fullPath = join(uploadsRoot, storedFileName);

        await mkdir(uploadsRoot, { recursive: true });
        await writeFile(fullPath, request.file.buffer);

        return {
            inputPath: fullPath,
            inputLabel: `upload://${request.file.originalname}`,
        };
    }
}
