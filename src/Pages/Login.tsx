import React, {useState} from 'react';
import {Box, Button, Container, TextField, Typography} from '@mui/material';
import api, {LoginPayload} from "../services/api"; // Ensure you have a login method here
import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min'
import {useStores} from "../models/helpers/useStores";
import {useApiService} from "../hooks";
import {useNavigate} from "react-router-dom";
import {observer} from "mobx-react";
import {applySnapshot} from "mobx-state-tree";

export interface LoginState {
    email: string;
    password: string;
    totp: string; // For TOTP code input
}

export const Login = observer(function Login() {
    const {authStore, userStore} = useStores()
    const apiService = useApiService()
    const navigate = useNavigate();

    const [state, setState] = useState<LoginState>({
        email: 'test@email.com',
        password: 'SomePassword784512omgVerySecure',
        totp: "",
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

        try {
            const loginResponse = await apiService.login(payload);
            authStore.setAuthToken(loginResponse.token);
            api.setAuthToken(loginResponse.token); // Manually set the token for immediate effect

            const meResponse = await apiService.getMe();
            // userStore.me.setSerializedIdentity(meResponse.serializedIdentity)
            applySnapshot(userStore.me, meResponse)
            navigate("/home")

        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed');
        }
    };

    return (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight="75vh"> {/* Adjusted part */}
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
        </Box>
    );
});