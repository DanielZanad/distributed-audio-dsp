import { ProcessAudio } from "./process-audio";
import { InMemoryAudioJobRepository } from "@test/repositories/in-memory-audio-job-repository";
import { AudioInputStorage } from "@app/storage/audio-input-storage";

class FakeAudioInputStorage implements AudioInputStorage {
    async storeUploadedInput(request: { userId: string; jobId: string; file: { originalname: string } }) {
        return {
            inputPath: `/tmp/${request.userId}/${request.jobId}.mp3`,
            inputLabel: `upload://${request.file.originalname}`,
        };
    }
}

describe("ProcessAudio", () => {
    it("dispatches a job for a remote input url", async () => {
        const repository = new InMemoryAudioJobRepository();
        const useCase = new ProcessAudio(repository, new FakeAudioInputStorage());

        const response = await useCase.execute({
            userId: "user-1",
            inputUrl: "https://example.com/audio.mp3",
            effects: [{ type: "gain", amount: 1.2 }],
        });

        expect(response.status).toBe("processing");
        expect(repository.jobs).toHaveLength(1);
        expect(repository.queuedMessages).toHaveLength(1);
        expect(repository.queuedMessages[0].message.input_path).toBe("https://example.com/audio.mp3");
    });

    it("stores an uploaded file before dispatching the job", async () => {
        const repository = new InMemoryAudioJobRepository();
        const useCase = new ProcessAudio(repository, new FakeAudioInputStorage());

        const response = await useCase.execute({
            userId: "user-1",
            uploadedFile: {
                originalname: "demo.mp3",
                buffer: Buffer.from("audio"),
            },
            effects: JSON.stringify([{ type: "bitcrusher", bits: 8 }]),
        });

        expect(response.status).toBe("processing");
        expect(repository.jobs[0].input_url).toBe("upload://demo.mp3");
        expect(repository.queuedMessages[0].message.input_path).toContain("/tmp/user-1/");
        expect(repository.queuedMessages[0].message.effects).toEqual([{ type: "bitcrusher", bits: 8 }]);
    });
});
