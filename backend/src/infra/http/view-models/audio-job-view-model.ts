import { AudioJobRecord } from "@app/repositories/audio-job-repository";

export class AudioJobViewModel {
    static toHTTP(audioJob: AudioJobRecord) {
        return {
            job_id: audioJob.job_id,
            input_url: audioJob.input_url,
            output_url: audioJob.output_url,
            output_size_bytes: audioJob.output_size_bytes,
            status: audioJob.status,
            created_at: audioJob.created_at,
            updated_at: audioJob.updated_at,
            completed_at: audioJob.completed_at,
        };
    }
}
