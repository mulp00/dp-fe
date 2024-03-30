import axios, {AxiosInstance} from 'axios';
import {RegistrationState} from "../Pages/Register";
import {useStores} from "../models/helpers/useStores";

export interface RegisterPayload {
    email: string;
    password: string;
    masterKey: string;
    mfkdfpolicy: {
        policy: string;
    };
    identity: string;
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

interface GetPolicyResponse {
    policy: string;
}

interface GetMeResponse {
    identity: string;
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
}

const apiService = new ApiService();
export default apiService;
