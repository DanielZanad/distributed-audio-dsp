import { Injectable, Logger } from "@nestjs/common";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type ResolveOutputUrlInput = {
    output_key: string | null;
    output_url: string | null;
};

@Injectable()
export class R2SigningService {
    private readonly logger = new Logger(R2SigningService.name);
    private readonly endpoint = process.env.CLOUDFLARE_ENDPOINT;
    private readonly accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
    private readonly secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
    private readonly bucketName = process.env.R2_BUCKET_NAME;
    private readonly expiresInSeconds = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS ?? 900);
    private readonly isConfigured =
        Boolean(this.endpoint) &&
        Boolean(this.accessKeyId) &&
        Boolean(this.secretAccessKey) &&
        Boolean(this.bucketName);
    private readonly client: S3Client | null;

    constructor() {
        this.client = this.isConfigured
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

        if (!this.isConfigured) {
            this.logger.warn(
                "R2 signing env vars are missing; API will return stored output_url values when available.",
            );
        }
    }

    async resolveOutputUrl(input: ResolveOutputUrlInput): Promise<string | null> {
        if (input.output_key) {
            const signedUrl = await this.trySign(input.output_key);
            if (signedUrl) {
                return signedUrl;
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

    private async trySign(objectKey: string): Promise<string | null> {
        if (!this.isConfigured || !this.client || !this.bucketName) {
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
}
