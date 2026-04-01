export type CreateAudioJobRecordDTO = {
    job_id: string;
    user_id: string;
    input_url: string;
    status: string;
};

export type AudioStatusMessageDTO = {
    job_id: string;
    status: string;
    output_url: string;
    output_size_bytes?: number | null;
};

export type AudioJobRecord = {
    job_id: string;
    user_id: string;
    input_url: string;
    output_url: string | null;
    output_size_bytes: number | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
};

export type ListAudioJobsResult = {
    items: AudioJobRecord[];
    total: number;
};

export abstract class AudioJobRepository {
    abstract sendToQueue(queue: string, message: any): Promise<void>
    abstract createJobRecord(data: CreateAudioJobRecordDTO): Promise<void>
    abstract updateJobStatus(jobId: string, status: string): Promise<void>
    abstract handleJobComplete(message: AudioStatusMessageDTO): Promise<void>
    abstract findByJobIdAndUser(jobId: string, userId: string): Promise<AudioJobRecord | null>
    abstract listByUser(userId: string, page: number, limit: number): Promise<ListAudioJobsResult>
}
