import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { JwtService } from "@nestjs/jwt";
import { AudioOutputStorageService } from "./audio-output-storage.service";

describe("AudioOutputStorageService", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it("prefers a signed R2 URL when the driver is R2", async () => {
        process.env.AUDIO_STORAGE_DRIVER = "r2";

        const service = new AudioOutputStorageService(new JwtService({ secret: "test-secret" }));
        const r2Url = "https://signed.example.com/processed/job-1.wav";
        const tryResolveR2UrlSpy = jest
            .spyOn(service as any, "tryResolveR2Url")
            .mockResolvedValue(r2Url);
        const tryResolveLocalUrlSpy = jest
            .spyOn(service as any, "tryResolveLocalUrl")
            .mockResolvedValue("http://localhost:3000/api/audio/job-1/output?token=fallback");

        const resolved = await service.resolveOutputUrl({
            job_id: "job-1",
            user_id: "user-1",
            output_key: "processed/job-1.wav",
            output_url: null,
            requestOrigin: "http://localhost:3000",
        });

        expect(resolved).toBe(r2Url);
        expect(tryResolveR2UrlSpy).toHaveBeenCalled();
        expect(tryResolveLocalUrlSpy).not.toHaveBeenCalled();
    });

    it("returns an absolute API output URL when a local file exists", async () => {
        const storageRoot = mkdtempSync(join(tmpdir(), "audio-output-storage-"));
        const outputKey = "processed/job-1.wav";
        const fullOutputPath = join(storageRoot, outputKey);

        mkdirSync(join(storageRoot, "processed"), { recursive: true });
        writeFileSync(fullOutputPath, "wav-data");

        process.env.AUDIO_STORAGE_DRIVER = "local";
        process.env.LOCAL_AUDIO_STORAGE_ROOT = storageRoot;

        const service = new AudioOutputStorageService(new JwtService({ secret: "test-secret" }));
        const resolved = await service.resolveOutputUrl({
            job_id: "job-1",
            user_id: "user-1",
            output_key: outputKey,
            output_url: null,
            requestOrigin: "http://localhost:3000",
        });

        expect(resolved).toContain("http://localhost:3000/api/audio/job-1/output?");
        expect(new URL(resolved ?? "").searchParams.get("token")).toBeTruthy();

        rmSync(storageRoot, { recursive: true, force: true });
    });

    it("rejects local output path traversal", async () => {
        const storageRoot = mkdtempSync(join(tmpdir(), "audio-output-storage-"));

        process.env.LOCAL_AUDIO_STORAGE_ROOT = storageRoot;

        const service = new AudioOutputStorageService(new JwtService({ secret: "test-secret" }));
        const resolved = await service.resolveLocalOutputPath("../escape.wav");

        expect(resolved).toBeNull();

        rmSync(storageRoot, { recursive: true, force: true });
    });

    it("falls back to the stored output_url when no backend can resolve the file", async () => {
        const service = new AudioOutputStorageService(new JwtService({ secret: "test-secret" }));

        const resolved = await service.resolveOutputUrl({
            job_id: "job-2",
            user_id: "user-2",
            output_key: "missing.wav",
            output_url: "https://cdn.example.com/job-2.wav",
            requestOrigin: "http://localhost:3000",
        });

        expect(resolved).toBe("https://cdn.example.com/job-2.wav");
    });
});
