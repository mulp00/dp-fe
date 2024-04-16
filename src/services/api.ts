import axios, {AxiosInstance} from 'axios';
import {Instance} from "mobx-state-tree";

export interface Member {
    id: string;
    email: string;
    keyPackage: string;
}

export type GroupResponse = {
    groupId: string;
    serializedUserGroupId: string;
    name: string;
    creator: Member;
    serializedGroup: { ciphertext: string, iv: string; };
    users: [
        Member
    ];
    lastEpoch: number;
    epoch: number;
}

export interface RegisterPayload {
    email: string;
    masterKey: string;
    mfkdfpolicy: {
        policy: string;
    };
    serializedIdentity: { ciphertext: string, iv: string; };
    keyPackage: string;
    keyStore: { ciphertext: string, iv: string; };
}

export interface LoginPayload {
    email: string;
    masterKeyHash: string;
}

interface LoginResponse {
    token: string;
}

export interface GetPolicyPayload {
    email: string;
}

export interface GetPolicyResponse {
    policy: string;
}

export interface GetMeResponse {
    serializedIdentity: { ciphertext: string, iv: string; };
    email: string;
    keyPackage: string;
    keyStore: { ciphertext: string, iv: string; };
}

export interface PostNewGroupPayload {
    name: string;
    serializedGroup: { ciphertext: string, iv: string; };
    ratchetTree: string;
}

export interface GetUsersByEmailPayload {
    email: string;
}

export type GetUsersByEmailResponse = [
    Member
]


export type GetGroupCollection = [
    GroupResponse
];

export interface PostWelcomeMessage {
    groupId: string;
    memberId: string;
    welcomeMessage: string;
    commitMessage: string;
    ratchetTree: string;
}

// export interface PatchRatchetTree {
//     groupId: string;
//     ratchetTree: string;
// }

export interface PatchSerializedUserGroup {
    serializedUserGroupId: string;
    serializedUserGroup: { ciphertext: string, iv: string; };
    epoch: number;
}

export type GetGroupsToJoin = [
    {
        welcomeMessageId: string;
        id: string;
        groupId: string;
        message: string,
        ratchetTree: string,
        epoch: string,
    }
]

export interface CreateSerializedUserGroupAfterJoinPayload {
    groupId: string,
    serializedUserGroup: { ciphertext: string, iv: string; },
    epoch: string,
    welcomeMessageId: string,
}

export interface GetCommitMessagesPayload {
    groupId: string;
    epoch: number;
}

export type GetCommitMessagesResponse = [
    {
        message: string;
        epoch: number;
    }
]

export interface PatchKeyStorePayload {
    keyStore: { ciphertext: string, iv: string; };
}

export interface PatchKeyPackagePayload {
    keyPackage: string;
}

export interface RemoveUserPayload {
    message: string;
    groupId: string;
    userId: string;
    epoch: number;
}

export interface LeaveGroupPayload {
    message: string;
    groupId: string;
    epoch: number;
}

export interface CreateGeneralCommitMessagePayload {
    message: string;
    groupId: string;
    epoch: number;
}

export interface CreateGroupItemPayload {
    name: string;
    description: string;
    groupId: string;
    type: string;
    content: { ciphertext: string, iv: string; };
    epoch: number;
}

export interface UpdateGroupItemPayload {
    itemId: string;
    name: string;
    description: string;
    groupId: string;
    type: string;
    content: { ciphertext: string, iv: string; };
    epoch: number;
}

export interface DeleteGroupItemPayload {
    groupId: string;
    itemId: string;
}

export interface DeleteGroupPayload {
    groupId: string;
}

export interface GroupItemResponse {
    itemId: string;
    name: string;
    description: string;
    groupId: string;
    type: string;
    content: { ciphertext: string, iv: string; };
}

export type GetGroupItemCollectionResponse = [
    GroupItemResponse
]

export interface GetGroupItemsPayload {
    groupId: string;
}

export interface RefreshTokenPayload {
    token: string;
}

export interface RefreshTokenResponse {
    token: string;
}

type ErrorHandler = (error: any) => void;

export default class ApiService {
    axiosInstance: AxiosInstance;
    errorHandlers: ErrorHandler[] = []; // Use the ErrorHandler type here
    private updateTokenInStore?: (token: string) => void;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://localhost/',
        });
        this.initializeInterceptors();
    }

    public setTokenUpdater(updateToken: (token: string) => void): void {
        this.updateTokenInStore = updateToken
    }

    public setAuthToken(token: string): void {
        this.axiosInstance.defaults.headers.common['Authorization'] = `BEARER ${token}`;
    }

    public removeAuthToken(): void {
        delete this.axiosInstance.defaults.headers.common['Authorization'];
    }

    public onAuthError(handler: (error: any) => void): void {
        this.errorHandlers.push(handler);
    }

    private handleAuthError(error: any): void {
        this.errorHandlers.forEach(handler => handler(error));
    }


    private initializeInterceptors() {
        this.axiosInstance.interceptors.response.use(
            (response) => {
                return response;
            },
            async (error) => {

                const originalRequest = error.config;


                if (error.response) {

                    if (error.response.status === 401 && !originalRequest._retry) {
                        if (originalRequest.url === '/token/refresh') {
                            return Promise.reject(error);
                        }
                        if (!originalRequest._retry && (error.response.data.error === 'token_expired' || error.response.data.error === 'token_invalid')) {
                            originalRequest._retry = true; // Mark the request as retried to prevent infinite loops
                            try {
                                const newToken = await this.refreshAuthToken();

                                this.setAuthToken(newToken.token);
                                this.updateTokenInStore && this.updateTokenInStore(newToken.token);

                                originalRequest.headers['Authorization'] = `BEARER ${newToken.token}`;
                                return this.axiosInstance(originalRequest);
                            } catch (refreshError) {
                                console.error(refreshError)
                                return Promise.reject(refreshError);
                            }
                        } else if (error.response.data.error === 'refresh_token_expired') {
                            this.removeAuthToken();
                            this.handleAuthError(error); // Notify all registered handlers
                            return Promise.reject(error);

                        }
                    }
                } else {
                    console.error("Network error or no server response");
                }

                return Promise.reject(error);
            }
        );
    }

    public async refreshAuthToken(): Promise<LoginResponse> {
        return this.axiosInstance.post('/token/refresh', null, {
            headers: {
                'Authorization': undefined, // This overrides the instance default and removes the header
            },
            withCredentials: true
        }).then(response => response.data);
    }

    public async logout(): Promise<string> {
        return this.axiosInstance.post('/token/invalidate', null, {
            headers: {
                'Authorization': undefined, // This overrides the instance default and removes the header
            },
            withCredentials: true
        });
    }

    public async register(payload: RegisterPayload): Promise<any> {
        return this.axiosInstance.post('/auth/register', payload, {
            headers: {
                "Content-type": "application/ld+json"
            },
        });
    }

    public async login(payload: LoginPayload): Promise<LoginResponse> {
        return this.axiosInstance.post<LoginResponse>('/auth/login', payload, {
            headers: {
                "Content-type": "application/json"
            },
            withCredentials: true
        }).then(response => response.data);
    }

    public async getPolicy(payload: GetPolicyPayload): Promise<GetPolicyResponse> {
        const encodedEmail = encodeURIComponent(payload.email);
        return this.axiosInstance.get<GetPolicyResponse>(`/auth/user/${encodedEmail}/policy`)
            .then(response => response.data);
    }

    public async getMe(): Promise<GetMeResponse> {
        return this.axiosInstance.get(`/me`)
            .then(response => response.data);
    }

    public async createGroup(payload: PostNewGroupPayload): Promise<GroupResponse> {
        return this.axiosInstance.post<GroupResponse>('/groups', payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getGroupCollection(): Promise<GetGroupCollection> {
        return this.axiosInstance.get(`/me/serialized-user-groups`)
            .then(response => response.data);
    }

    public async getUsersByEmail(payload: GetUsersByEmailPayload): Promise<GetUsersByEmailResponse> {
        return this.axiosInstance.get<GetUsersByEmailResponse>(`/users`,
            {
                params: {
                    email: payload.email
                }
            })
            .then(response => response.data);
    }

    public async createWelcomeMessage(payload: PostWelcomeMessage): Promise<string> {
        return this.axiosInstance.post<string>(`/groups/${encodeURIComponent(payload.groupId)}/welcome-messages`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async removeUser(payload: RemoveUserPayload): Promise<string> {
        return this.axiosInstance.delete<string>(`/groups/${encodeURIComponent(payload.groupId)}/users/${encodeURIComponent(payload.userId)}`, {
            data: payload,
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async leaveGroup(payload: LeaveGroupPayload): Promise<string> {
        return this.axiosInstance.post<string>(`/groups/${encodeURIComponent(payload.groupId)}/leave`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    // public async updateRatchetTree(payload: PatchRatchetTree): Promise<string> {
    //     return this.axiosInstance.patch<string>('/updateRatchetTree', payload, {
    //         headers: {
    //             "Content-type": "application/merge-patch+json"
    //         }
    //     }).then(response => response.data);
    // }

    public async updateSerializedUserGroup(payload: PatchSerializedUserGroup): Promise<GroupResponse> {
        return this.axiosInstance.patch<GroupResponse>(`/serialized-user-groups/${encodeURIComponent(payload.serializedUserGroupId)}`, payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async updateKeyStore(payload: PatchKeyStorePayload): Promise<string> {
        return this.axiosInstance.patch<string>('/me/key-store', payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async updateKeyPackage(payload: PatchKeyPackagePayload): Promise<string> {
        return this.axiosInstance.patch<string>('/me/key-package', payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async getGroupsToJoin(): Promise<GetGroupsToJoin> {
        return this.axiosInstance.get<GetGroupsToJoin>(`/me/groups-to-join`)
            .then(response => response.data);
    }

    public async createSerializedUserGroupAfterJoin(payload: CreateSerializedUserGroupAfterJoinPayload): Promise<GroupResponse> {
        return this.axiosInstance.post<GroupResponse>(`/serialized-user-groups`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getCommitMessages(payload: GetCommitMessagesPayload): Promise<GetCommitMessagesResponse> {
        return this.axiosInstance.get<GetCommitMessagesResponse>(`/groups/${encodeURIComponent(payload.groupId)}/messages`, {
            params: {
                epoch: payload.epoch
            },
        }).then(response => response.data);
    }

    public async postGeneralCommitMessage(payload: CreateGeneralCommitMessagePayload): Promise<string> {
        return this.axiosInstance.post<string>(`/groups/${encodeURIComponent(payload.groupId)}/messages`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async createNewGroupItem(payload: CreateGroupItemPayload): Promise<GroupItemResponse> {
        return this.axiosInstance.post<GroupItemResponse>(`/groups/${encodeURIComponent(payload.groupId)}/group-items`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async updateGroupItem(payload: UpdateGroupItemPayload): Promise<GroupItemResponse> {
        return this.axiosInstance.patch<GroupItemResponse>(`/groups/${encodeURIComponent(payload.groupId)}/group-items/${encodeURIComponent(payload.itemId)}`, payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async deleteGroupItem(payload: DeleteGroupItemPayload): Promise<string> {
        return this.axiosInstance.delete(`/groups/${encodeURIComponent(payload.groupId)}/group-items/${encodeURIComponent(payload.itemId)}`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async deleteGroup(payload: DeleteGroupPayload): Promise<string> {
        return this.axiosInstance.delete<string>(`/groups/${encodeURIComponent(payload.groupId)}`)
            .then(response => response.data);
    }

    public async getGroupItems(payload: GetGroupItemsPayload): Promise<GetGroupItemCollectionResponse> {
        return this.axiosInstance.get<GetGroupItemCollectionResponse>(`/groups/${encodeURIComponent(payload.groupId)}/group-items`)
            .then(response => response.data);
    }

}

