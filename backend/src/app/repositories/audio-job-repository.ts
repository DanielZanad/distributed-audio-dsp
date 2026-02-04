export abstract class AudioJobRepository {
    abstract sendToQueue(queue: string, message: any): Promise<void>
    abstract handleJobComplete(message: any): Promise<void>
}