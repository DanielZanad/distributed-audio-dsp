import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString, IsUrl } from "class-validator";

export class ProcessAudioBody {
    @IsOptional()
    @IsString()
    @IsUrl({ require_tld: false })
    input_url?: string;

    @Transform(({ value }) => {
        if (typeof value !== "string") {
            return value;
        }

        return JSON.parse(value);
    })
    @IsArray()
    effects: any[];
}
