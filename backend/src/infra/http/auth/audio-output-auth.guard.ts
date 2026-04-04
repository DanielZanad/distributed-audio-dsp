import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

type AuthenticatedRequest = Request & {
    user?: Record<string, unknown>;
    params?: {
        jobId?: string;
    };
    query?: {
        token?: string | string[];
    };
};

@Injectable()
export class AudioOutputAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const headerToken = this.extractTokenFromHeader(request);
        const queryToken = this.extractTokenFromQuery(request);
        const token = headerToken ?? queryToken;

        if (!token) {
            throw new UnauthorizedException();
        }

        try {
            const payload = await this.jwtService.verifyAsync(token);

            if (!headerToken) {
                if (payload.purpose !== "audio-output") {
                    throw new UnauthorizedException();
                }

                if (payload.job_id !== request.params?.jobId) {
                    throw new UnauthorizedException();
                }
            }

            request.user = payload;
        } catch {
            throw new UnauthorizedException();
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }

    private extractTokenFromQuery(request: AuthenticatedRequest): string | undefined {
        const token = request.query?.token;
        return typeof token === "string" && token.length > 0 ? token : undefined;
    }
}
