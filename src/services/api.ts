import axios, {AxiosInstance} from 'axios';

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
    serializedGroup: string;
    users: [
        Member
    ];
    lastEpoch: number;
    epoch: number;
}

export interface RegisterPayload {
    email: string;
    password: string;
    masterKey: string;
    mfkdfpolicy: {
        policy: string;
    };
    serializedIdentity: string;
    keyPackage: string;
    keyStore: string;
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
    serializedIdentity: string;
    email: string;
    keyPackage: string;
}

export interface PostNewGroupPayload {
    name: string;
    serializedGroup: string;
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
    serializedUserGroup: string;
    epoch:number;
}

export type GetGroupsToJoin = {
    welcomeMessages: [
        {
            welcomeMessageId: string;
            id: string;
            groupId: string;
            message: string,
            ratchetTree: string,
            epoch: string,
        }
    ]
}

export interface CreateSerializedUserGroupAfterJoinPayload {
    groupId: string,
    serializedUserGroup: string,
    epoch: string,
    welcomeMessageId: string,
}

export interface GetCommitMessagesPayload {
    groupId: string;
    epoch: number;
}

export interface GetCommitMessagesResponse {
    messages: [
        {
            message: string;
            epoch: number;
        }
    ]
}

export interface PatchKeyStorePayload {
    keyStore: string;
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

export interface LeaveGroupPayload{
    message: string;
    groupId: string;
    epoch: number;
}

export interface CreateGeneralCommitMessagePayload {
    message: string;
    groupId: string;
    epoch: number;
}

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://localhost/',
            // withCredentials: true, TODO
        });

        this.initializeInterceptors();
    }

    public setAuthToken(token: string): void {
        this.axiosInstance.defaults.headers.common['Authorization'] = `BEARER ${token}`;
    }

    public removeAuthToken(): void {
        delete this.axiosInstance.defaults.headers.common['Authorization'];
    }


    private initializeInterceptors() {
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Perform actions before request is sent, like adding auth headers
                // config.headers['Authorization'] = 'Bearer yourAuthToken';
                return config;
            },
            (error) => {
                // Do something with request error
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                // Any status code that lie within the range of 2xx cause this function to trigger
                return response;
            },
            (error) => {
                // Any status codes that falls outside the range of 2xx cause this function to trigger
                // Do something with response error
                return Promise.reject(error);
            }
        );
    }

    public async register(payload: RegisterPayload): Promise<any> {
        return this.axiosInstance.post('/auth/register', payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        });
    }

    public async login(payload: LoginPayload): Promise<LoginResponse> {
        return this.axiosInstance.post<LoginResponse>('/auth/login', payload, {
            headers: {
                "Content-type": "application/json"
            }
        }).then(response => response.data);
    }

    public async getPolicy(payload: GetPolicyPayload): Promise<GetPolicyResponse> {
        const encodedEmail = encodeURIComponent(payload.email);
        return this.axiosInstance.get<GetPolicyResponse>(`/auth/user/${encodedEmail}/policy`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getMe(): Promise<GetMeResponse> {
        return this.axiosInstance.get(`/me`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async createGroup(payload: PostNewGroupPayload): Promise<GroupResponse> {
        return this.axiosInstance.post<GroupResponse>('/newGroup', payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getGroupCollection(): Promise<GetGroupCollection> {
        return this.axiosInstance.get(`/serializedGroupCollection`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getUsersByEmail(payload: GetUsersByEmailPayload): Promise<GetUsersByEmailResponse> {
        const encodedEmail = encodeURIComponent(payload.email);
        return this.axiosInstance.get<GetUsersByEmailResponse>(`/getByEmail/${encodedEmail}`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async createWelcomeMessage(payload: PostWelcomeMessage): Promise<string> {
        return this.axiosInstance.post<string>('/welcomeMessage', payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }
    public async removeUser(payload: RemoveUserPayload): Promise<string> {
        return this.axiosInstance.post<string>('/removeUser', payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }
    public async leaveGroup(payload: LeaveGroupPayload): Promise<string> {
        return this.axiosInstance.post<string>('/leaveGroup', payload, {
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
        return this.axiosInstance.patch<GroupResponse>('/updateSerializedUserGroup', payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }
    public async updateKeyStore(payload: PatchKeyStorePayload): Promise<string> {
        return this.axiosInstance.patch<string>('/updateKeyStore', payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async updateKeyPackage(payload: PatchKeyPackagePayload): Promise<string> {
        return this.axiosInstance.patch<string>('/updateKeyPackage', payload, {
            headers: {
                "Content-type": "application/merge-patch+json"
            }
        }).then(response => response.data);
    }

    public async getGroupsToJoin(): Promise<GetGroupsToJoin> {
        return this.axiosInstance.get<GetGroupsToJoin>(`/getGroupsToJoin`, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async createSerializedUserGroupAfterJoin(payload: CreateSerializedUserGroupAfterJoinPayload): Promise<GroupResponse> {
        return this.axiosInstance.post<GroupResponse>(`/createSerializedUserGroupAfterJoin`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

    public async getCommitMessages(payload: GetCommitMessagesPayload): Promise<GetCommitMessagesResponse> {
        return this.axiosInstance.post<GetCommitMessagesResponse>(`/getCommitMessages`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }
    public async postGeneralCommitMessage(payload: CreateGeneralCommitMessagePayload): Promise<string> {
        return this.axiosInstance.post<string>(`/createGeneralCommitMessage`, payload, {
            headers: {
                "Content-type": "application/ld+json"
            }
        }).then(response => response.data);
    }

}

const apiService = new ApiService();
export default apiService;
