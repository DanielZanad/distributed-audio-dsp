import { randomUUID } from 'node:crypto';

export interface UserProps {
    username: string;
    email: string;
    password: string;
    avatar_url: string;
    created_at: Date;
    updated_at?: Date | null;
    plan: 'free' | 'premium';
}

export class User {
    private _id: string;
    private props: UserProps;

    constructor(
        props: Omit<UserProps, 'created_at' | 'plan'> & {
            created_at?: Date;
            plan?: 'free' | 'premium';
        },
        id?: string,
    ) {
        this._id = id ?? randomUUID();
        this.props = {
            ...props,
            created_at: props.created_at ?? new Date(),
            plan: props.plan ?? 'free',
        };
    }

    public get id(): string {
        return this._id;
    }

    public get username(): string {
        return this.props.username;
    }

    public set username(username: string) {
        this.props.username = username;
        this.touch();
    }

    public get email(): string {
        return this.props.email;
    }

    public set email(email: string) {
        this.props.email = email;
        this.touch();
    }

    public get password(): string {
        return this.props.password;
    }

    public set password(password: string) {
        this.props.password = password;
        this.touch();
    }

    public get avatar_url(): string {
        return this.props.avatar_url;
    }

    public set avatar_url(avatar_url: string) {
        this.props.avatar_url = avatar_url;
        this.touch();
    }

    public get created_at(): Date {
        return this.props.created_at;
    }

    public get updated_at(): Date | null | undefined {
        return this.props.updated_at;
    }

    public get plan(): 'free' | 'premium' {
        return this.props.plan;
    }

    public set plan(plan: 'free' | 'premium') {
        this.props.plan = plan;
        this.touch();
    }

    private touch() {
        this.props.updated_at = new Date();
    }
}