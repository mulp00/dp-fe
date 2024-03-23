import React, { useState } from 'react';
import { Container, TextField, Button, Typography } from '@mui/material';
import api from "../services/api";

export interface RegistrationState {
    email: string;
    masterKey: string;
    policy: string;
}

export default function Registration() {
    const [state, setState] = useState<RegistrationState>({
        email: '',
        masterKey: '',
        policy: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setState(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.register(state);
            alert('Registration successful');
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Typography component="h1" variant="h5">Register</Typography>
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
                    label="Master Key"
                    type="password"
                    name="masterKey"
                    value={state.masterKey}
                    onChange={handleChange}
                />
                <TextField
                    variant="outlined"
                    margin="normal"
                    required
                    fullWidth
                    label="MFKDF Policy JSON"
                    name="policy"
                    multiline
                    rows={4}
                    value={state.policy}
                    onChange={handleChange}
                />
                <Button type="submit" fullWidth variant="contained" color="primary">
                    Register
                </Button>
            </form>
        </Container>
    );
}
