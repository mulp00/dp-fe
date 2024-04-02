import axios, {AxiosInstance} from 'axios';

export interface Member {
    id: string;
    email: string;
    keyPackage: string;
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

export interface PostNewGroupResponse {
    id: string;
    name: string;
    creator: Member;
    serializedGroup: string;
    users: [
        Member
    ];
}

export interface GetUsersByEmailPayload {
    email: string;
}

export type GetUsersByEmailResponse = [
    Member
]


export type GetGroupCollection = [
    {
        id: string;
        name: string;
        creator: Member;
        serializedGroup: string;
        users: [
            Member
        ];
    }
];

interface PostWelcomeMessage {
    groupId: string;
    memberId: string;
    welcomeMessage: string;
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

    public async createGroup(payload: PostNewGroupPayload): Promise<PostNewGroupResponse> {
        return this.axiosInstance.post<PostNewGroupResponse>('/serializedGroup', payload, {
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
    } // TODO pridal jsem endpoint na welcomemessage, hazi to ale 500 kdyz by se snazil o ten uniqueconstraint tak to chce pridat do controlleru, pak nejak handlovat to pridavani useru pojejich invitovani a hlavne pridani message

}

const apiService = new ApiService();
export default apiService;
