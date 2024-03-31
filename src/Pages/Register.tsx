import React, {useEffect, useState} from 'react';
import {Container, TextField, Button, Typography} from '@mui/material';
import api, {RegisterPayload} from "../services/api";
import QRCode from 'react-qr-code'
import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min'
import __wbg_init, {Identity, Provider} from "../utils/crypto/openmls";
import {useStores} from "../models/helpers/useStores";
import {observer} from "mobx-react";

export interface RegistrationState {
    email: string;
    password: string;
    masterKey: string;
    policy: string;
}

export const Register = observer(function Register() {
        const [qr, setQr] = useState<string>()
        const [isWasmInitialized, setWasmInitialized] = useState(false);

        const [state, setState] = useState<RegistrationState>({
            email: 'test@email.com',
            password: 'qwertyu',
            masterKey: '',
            policy: '',
        });

        useEffect(() => {
            const initializeWasm = async () => {
                await __wbg_init();
                setWasmInitialized(true);
            };

            if (!isWasmInitialized) {
                initializeWasm();
            }
        }, [isWasmInitialized]);


        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const {name, value} = e.target;
            setState(prevState => ({...prevState, [name]: value}));
        };

        const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            if (!isWasmInitialized) {
                console.error("WebAssembly is not initialized.");
                return;
            }

            const provider = new Provider();
            const identity = new Identity(provider, state.email)
            const serialized_identity = identity.serialize()

            const setup = await mfkdf.setup.key([
                await mfkdf.setup.factors.password(state.password),
                await mfkdf.setup.factors.totp(),
            ], {size: 32})

            setQr(setup.outputs.totp.uri)

            const payload: RegisterPayload = {
                email: state.email,
                password: state.password,
                masterKey: setup.key.toString('hex'),
                mfkdfpolicy: {
                    policy: JSON.stringify(setup.policy)
                },
                serializedIdentity: serialized_identity
            };

            try {
                await api.register(payload);
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
                        label="Password"
                        type="password"
                        name="password"
                        value={state.password}
                        onChange={handleChange}
                    />
                    {qr && <QRCode value={qr}/>}
                    <Button type="submit" fullWidth variant="contained" color="primary">
                        Register
                    </Button>
                </form>
            </Container>
        )
    }
)
