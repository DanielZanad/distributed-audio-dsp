import { IsArray, IsNotEmpty, IsString, IsUrl } from "class-validator";

export class ProcessAudioBody {
    @IsString()
    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    input_url: string;

    @IsArray()
    effects: any[];
}
