export type StoreUploadedAudioInputRequest = {
    userId: string;
    jobId: string;
    file: {
        buffer: Buffer;
        originalname: string;
    };
};

export type StoredAudioInput = {
    inputPath: string;
    inputLabel: string;
};

export abstract class AudioInputStorage {
    abstract storeUploadedInput(request: StoreUploadedAudioInputRequest): Promise<StoredAudioInput>
}
