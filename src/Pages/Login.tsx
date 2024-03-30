import React, {useState} from 'react';
import {Container, TextField, Button, Typography} from '@mui/material';
import api, {LoginPayload} from "../services/api"; // Ensure you have a login method here
import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min'
import {useStores} from "../models/helpers/useStores";
import {useApiService} from "../hooks";
import {useNavigate} from "react-router-dom";

export interface LoginState {
    email: string;
    password: string;
    totp: number; // For TOTP code input
}

export default function Login() {
    const {authStore} = useStores()
    const apiService = useApiService()
    const navigate = useNavigate();

    console.log(authStore.authToken)

    const [state, setState] = useState<LoginState>({
        email: 'test@email.com',
        password: 'qwertyu',
        totp: 123456,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setState(prevState => ({...prevState, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const policy = (await api.getPolicy({email: state.email})).policy

        const derive = await mfkdf.derive.key(JSON.parse(policy), {
            password: mfkdf.derive.factors.password(state.password),
            totp: mfkdf.derive.factors.totp(Number(state.totp), {time: Date.now()}),
        })

        const key = derive.key.toString('hex')

        const payload: LoginPayload = {
            email: state.email,
            masterKeyHash: key,
        };

        console.log(payload)

        try {
            const loginResponse = await apiService.login(payload);
            authStore.setAuthToken(loginResponse.token);
            api.setAuthToken(loginResponse.token); // Manually set the token for immediate effect

            const meResponse = await apiService.getMe();

            navigate("/home")

        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Typography component="h1" variant="h5">Login</Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={state.email}
                    onChange={handleChange}
                />
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="Password"
                    type="password"
                    name="password"
                    value={state.password}
                    onChange={handleChange}
                />
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="TOTP Code"
                    name="totp"
                    value={state.totp}
                    onChange={handleChange}
                />
                <Button type="submit" fullWidth variant="contained" color="primary">
                    Login
                </Button>
            </form>
        </Container>
    );
}
