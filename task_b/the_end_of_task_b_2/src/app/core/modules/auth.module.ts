export type User = {
    username: string;
    password: string;
    grant_type: string;
    client_id: string;
    client_secret: string;
};
export interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
}