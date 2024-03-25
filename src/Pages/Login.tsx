import React, { useState } from 'react';
import { Container, TextField, Button, Typography } from '@mui/material';
import api, {LoginPayload} from "../services/api"; // Ensure you have a login method here
import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min'

export interface LoginState {
    email: string;
    password: string;
    totp: number; // For TOTP code input
}

export default function Login() {
    const [state, setState] = useState<LoginState>({
        email: 'test@email.com',
        password: 'qwertyu',
        totp: 123456,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setState(prevState => ({ ...prevState, [name]: value }));
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
            const response = await api.login(payload);
            console.log(response)
            // Handle login success, such as saving the JWT or redirecting the user
            alert('Login successful');
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
