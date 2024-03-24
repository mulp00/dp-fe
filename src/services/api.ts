import axios, {AxiosInstance} from 'axios';
import {RegistrationState} from "../Pages/Register";

export interface RegisterPayload {
    email: string;
    password: string;
    masterKey: string;
    mfkdfpolicy: {
        policy: string
    };
}

class ApiService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://localhost/', // Replace with your actual API base URL
        });

        this.initializeInterceptors();
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

    // Example: Login method
    // public async login(email: string, password: string): Promise<any> {
    //   return this.axiosInstance.post('/auth/login', { email, password });
    // }

    // Add more methods as needed
}

const apiService = new ApiService();
export default apiService;
