import { access } from "fs/promises";
import { Injectable, Logger } from "@nestjs/common";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JwtService } from "@nestjs/jwt";
import { isAbsolute, relative, resolve } from "path";

type ResolveOutputUrlInput = {
    job_id: string;
    user_id: string;
    output_key: string | null;
    output_url: string | null;
    requestOrigin?: string | null;
};

type StorageDriver = "local" | "r2";

@Injectable()
export class AudioOutputStorageService {
    private readonly logger = new Logger(AudioOutputStorageService.name);
    private readonly preferredDriver = this.resolvePreferredDriver();
    private readonly apiPublicUrl = process.env.API_PUBLIC_URL?.replace(/\/$/, "") ?? null;
    private readonly localStorageRoot = resolve(process.env.LOCAL_AUDIO_STORAGE_ROOT ?? "/app/data");
    private readonly endpoint = process.env.CLOUDFLARE_ENDPOINT;
    private readonly accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
    private readonly secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
    private readonly bucketName = process.env.R2_BUCKET_NAME;
    private readonly expiresInSeconds = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? 900);
    private readonly localUrlExpiresInSeconds = Number(process.env.LOCAL_AUDIO_URL_TTL_SECONDS ?? 900);
    private readonly isR2Configured =
        Boolean(this.endpoint) &&
        Boolean(this.accessKeyId) &&
        Boolean(this.secretAccessKey) &&
        Boolean(this.bucketName);
    private readonly client: S3Client | null;

    constructor(private readonly jwtService: JwtService) {
        this.client = this.isR2Configured
            ? new S3Client({
                region: "auto",
                endpoint: this.endpoint,
                forcePathStyle: true,
                credentials: {
                    accessKeyId: this.accessKeyId!,
                    secretAccessKey: this.secretAccessKey!,
                },
            })
            : null;

        if (!this.isR2Configured) {
            this.logger.warn(
                "R2 signing env vars are missing; output URLs will prefer local files and fall back to stored output_url values.",
            );
        }
    }

    async resolveOutputUrl(input: ResolveOutputUrlInput): Promise<string | null> {
        const outputKey = input.output_key;

        if (outputKey) {
            const strategies =
                this.preferredDriver === "r2"
                    ? [this.tryResolveR2Url.bind(this), this.tryResolveLocalUrl.bind(this)]
                    : [this.tryResolveLocalUrl.bind(this), this.tryResolveR2Url.bind(this)];

            for (const strategy of strategies) {
                const resolvedUrl = await strategy(
                    input.job_id,
                    input.user_id,
                    outputKey,
                    input.requestOrigin ?? null,
                );
                if (resolvedUrl) {
                    return resolvedUrl;
                }
            }
        }

        if (!input.output_url) {
            return null;
        }

        const legacyKey = this.extractObjectKeyFromLegacyUrl(input.output_url);
        if (!legacyKey) {
            return input.output_url;
        }

        const signedLegacyUrl = await this.trySign(legacyKey);
        return signedLegacyUrl ?? input.output_url;
    }

    async resolveLocalOutputPath(outputKey: string | null): Promise<string | null> {
        if (!outputKey) {
            return null;
        }

        const fullPath = this.normalizeLocalOutputPath(outputKey);
        if (!fullPath) {
            return null;
        }

        try {
            await access(fullPath);
            return fullPath;
        } catch {
            return null;
        }
    }

    private async tryResolveLocalUrl(
        jobId: string,
        userId: string,
        outputKey: string,
        requestOrigin: string | null,
    ): Promise<string | null> {
        const fullPath = await this.resolveLocalOutputPath(outputKey);
        if (!fullPath) {
            return null;
        }

        const baseUrl = requestOrigin ?? this.apiPublicUrl;
        if (!baseUrl) {
            this.logger.warn(
                `Unable to build local output URL for job ${jobId}: missing request origin and API_PUBLIC_URL.`,
            );
            return null;
        }

        const token = await this.jwtService.signAsync(
            {
                sub: userId,
                job_id: jobId,
                purpose: "audio-output",
            },
            {
                expiresIn: this.localUrlExpiresInSeconds,
            },
        );
        const url = new URL(`/api/audio/${jobId}/output`, `${baseUrl}/`);
        url.searchParams.set("token", token);
        return url.toString();
    }

    private async tryResolveR2Url(
        _jobId: string,
        _userId: string,
        outputKey: string,
        _requestOrigin: string | null,
    ): Promise<string | null> {
        return this.trySign(outputKey);
    }

    private async trySign(objectKey: string): Promise<string | null> {
        if (!this.isR2Configured || !this.client || !this.bucketName) {
            return null;
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: objectKey,
            });

            return await getSignedUrl(this.client, command, {
                expiresIn: this.expiresInSeconds,
            });
        } catch (error) {
            this.logger.warn(`Failed to presign output object key ${objectKey}: ${error}`);
            return null;
        }
    }

    private normalizeLocalOutputPath(outputKey: string): string | null {
        const normalizedKey = outputKey.replace(/\\/g, "/").replace(/^\/+/, "");
        if (!normalizedKey) {
            return null;
        }

        const fullPath = resolve(this.localStorageRoot, normalizedKey);
        const relativePath = relative(this.localStorageRoot, fullPath);

        if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
            this.logger.warn(`Rejected local output key outside storage root: ${outputKey}`);
            return null;
        }

        return fullPath;
    }

    private extractObjectKeyFromLegacyUrl(url: string): string | null {
        if (!this.bucketName) {
            return null;
        }

        try {
            const parsed = new URL(url);
            const normalizedPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));

            if (!normalizedPath) {
                return null;
            }

            if (normalizedPath.startsWith(`${this.bucketName}/`)) {
                return normalizedPath.slice(this.bucketName.length + 1);
            }

            if (parsed.hostname.startsWith(`${this.bucketName}.`)) {
                return normalizedPath;
            }
        } catch {
            return null;
        }

        return null;
    }

    private resolvePreferredDriver(): StorageDriver {
        const rawValue = process.env.AUDIO_STORAGE_DRIVER?.trim().toLowerCase();

        if (rawValue === "local") {
            return "local";
        }

        return "r2";
    }
}
